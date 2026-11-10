import { catalogSaveRepository } from '../repositories/catalog-save.repository.js';
import { catalogMediaService } from './catalog-media.service.js';
import { movieMatchInput, actorMatchInput, movieIdentityForInsert, actorIdentityForInsert } from './catalog-match.service.js';
import { resolveCatalogReferences } from './catalog-reference.service.js';
import { assessCatalogDraft } from '../mappers/movie.mapper.js';
import { catalogActorPayloadSchema, isPublicHttpsUrl } from '../validators/catalog.validator.js';
import type { CatalogDraft, CatalogIssue } from '../types/catalog.types.js';
import type { CatalogMatchResult } from '../types/catalog-match.types.js';
import type { CatalogSaveMedia, CatalogSaveRepository, CatalogSaveResult, CatalogStagedMedia, CatalogSaveTransaction } from '../types/catalog-save.types.js';

class SaveBlocked extends Error {
  constructor(public issues: CatalogIssue[]) { super('CATALOG_ENRICHMENT_REQUIRED'); }
}
function block(path: string, message: string, action: CatalogIssue['action'] = 'research'): never {
  throw new SaveBlocked([{ path, message, action, blocking: true }]);
}
function requireKnown(match: CatalogMatchResult, path: string): void {
  if (match.status === 'needs-research' || match.status === 'conflict') block(path, match.reason);
}
function preflight(draft: CatalogDraft) {
  if (draft.research.linksOnly) block('research.linksOnly', 'A link-only follow-up is not a new film result.');
  if (!draft.actors.length || draft.actors.length > 5) block('actors', 'Research one to five main actors before saving.', 'resolve-actor');
  const allowedLater = (path: string) => path === 'homeImgPoster' || path === 'actorIds' || path === 'actors' || /^actors\.\d+\.(existingId|actorImg)$/.test(path);
  const issues = assessCatalogDraft(draft).issues.filter(issue => issue.blocking && !allowedLater(issue.path));
  if (issues.length) throw new SaveBlocked(issues);
}
async function resolveFranchise(draft: CatalogDraft, tx: Pick<CatalogSaveTransaction, 'matcher'>): Promise<number[]> {
  if (draft.movie.franchiseMovieIds.length && !draft.franchiseCandidates?.length) block('franchiseMovieIds', 'Internal IDs alone do not prove a franchise relationship.');
  const ids: number[] = [];
  if ((draft.franchiseCandidates?.length ?? 0) > 20) block('franchiseCandidates', 'Too many franchise candidates.');
  for (const candidate of draft.franchiseCandidates ?? []) {
    if (!candidate.relation.value?.trim() || !candidate.relation.sources.some(source => isPublicHttpsUrl(source.url))) block('franchiseCandidates', 'A sourced franchise relationship is required.');
    const match = await tx.matcher.movie(candidate.film); requireKnown(match, 'franchiseCandidates');
    if (match.status === 'existing' && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export function createCatalogSaver(deps: { repository: CatalogSaveRepository; media: CatalogSaveMedia } = { repository: catalogSaveRepository, media: catalogMediaService }) {
  const { repository, media } = deps;
  async function cleanup(keys: string[]) {
    if (!keys.length) return;
    try {
      // Reacquire the same transaction gate before deciding: a timed-out commit
      // must not cause deletion of media belonging to a successfully saved record.
      const unused = await repository.transaction(tx => tx.unreferencedMedia([...new Set(keys)]));
      for (const key of unused) try { await media.remove(key); } catch { console.warn('[CATALOG_MEDIA] Cleanup deferred'); }
    } catch { console.warn('[CATALOG_MEDIA] Cleanup deferred: database outcome unavailable'); }
  }
  return async function saveCatalogMovie(input: CatalogDraft): Promise<CatalogSaveResult> {
    const tracked: string[] = [];
    try {
      const initial = await repository.matcher.movie(movieMatchInput(input)); requireKnown(initial, 'identity');
      if (initial.status === 'existing') return { status: 'existing', movieId: initial.id };
      const references = resolveCatalogReferences(input, await repository.references());
      if (!references.ready) throw new SaveBlocked(references.issues);
      const draft = references.draft;
      draft.movie.actorIds = [];
      for (const actor of draft.actors) {
        const match = await repository.matcher.actor(actorMatchInput(actor)); requireKnown(match, 'actors');
        actor.existingId = match.status === 'existing' ? match.id : null;
        if (actor.existingId && !draft.movie.actorIds.includes(actor.existingId)) draft.movie.actorIds.push(actor.existingId);
        if (!actor.existingId && !actor.imageCandidates?.length) block('actors.imageCandidates', 'Research the new actor portrait before saving.', 'store-media');
      }
      preflight(draft);
      await resolveFranchise(draft, repository);
      if (!draft.posterCandidates.length) block('posterCandidates', 'A verified film poster is required.', 'store-media');
      const signal = AbortSignal.timeout(90000);
      const track = (key: string) => tracked.push(key);
      const staged: CatalogStagedMedia = { posters: await media.store('movieimg', draft.posterCandidates.map(item => item.url), 2, track, signal), actors: new Map() };
      for (const [index, actor] of draft.actors.entries()) if (!actor.existingId) {
        const images = await media.store('actorimg', actor.imageCandidates!.map(item => item.url), 1, track, signal);
        staged.actors.set(index, images[0]);
      }

      const result = await repository.transaction<CatalogSaveResult>(async tx => {
        const duplicate = await tx.matcher.movie(movieMatchInput(draft)); requireKnown(duplicate, 'identity');
        if (duplicate.status === 'existing') return { status: 'existing', movieId: duplicate.id };
        const freshReferences = resolveCatalogReferences(draft, await tx.references());
        if (!freshReferences.ready) throw new SaveBlocked(freshReferences.issues);
        const ready = freshReferences.draft;
        ready.movie.homeImgPoster = staged.posters[0].path; ready.movie.actorIds = [];
        ready.movie.franchiseMovieIds = await resolveFranchise(ready, tx);
        for (const [index, actor] of ready.actors.entries()) {
          const match = await tx.matcher.actor(actorMatchInput(actor)); requireKnown(match, `actors.${index}`);
          let id: number;
          if (match.status === 'existing') id = match.id;
          else {
            const image = staged.actors.get(index);
            if (!image) block(`actors.${index}`, 'Actor identity changed during saving; retry enrichment.', 'resolve-actor');
            const payload = catalogActorPayloadSchema.parse({ actorName: actor.actorName, actorAbout: actor.actorAbout, actorImg: image.path });
            id = await tx.nextId('actor');
            await tx.insertActor({ id, payload, identity: actorIdentityForInsert(actorMatchInput(actor)), research: { ...actor, actorImg: image.path, storedAsset: image }, mediaKeys: [image.key] });
          }
          actor.existingId = id; if (!ready.movie.actorIds.includes(id)) ready.movie.actorIds.push(id);
        }
        const assessment = assessCatalogDraft(ready);
        if (!assessment.ready || !assessment.payload) throw new SaveBlocked(assessment.issues.filter(issue => issue.blocking));
        const movieId = await tx.nextId('movie');
        ready.movie.franchiseMovieIds = ready.movie.franchiseMovieIds.filter(id => id !== movieId);
        const payload = { ...assessment.payload, franchiseMovieIds: ready.movie.franchiseMovieIds };
        await tx.insertMovie({ id: movieId, payload, identity: movieIdentityForInsert(movieMatchInput(ready)), research: { result: ready.research, localizedFacts: ready.localizedFacts ?? null, franchiseCandidates: ready.franchiseCandidates ?? [], storedAssets: staged.posters },
          posters: staged.posters.map(image => image.path), mediaKeys: staged.posters.map(image => image.key) });
        await tx.linkFranchise(movieId, payload.franchiseMovieIds);
        return { status: 'created', movieId, actorIds: payload.actorIds, posters: staged.posters.map(image => image.path) };
      });
      await cleanup(tracked);
      return result;
    } catch (error) {
      await cleanup(tracked);
      if (error instanceof SaveBlocked) return { status: 'needs-enrichment', issues: error.issues };
      throw error;
    }
  };
}
export const saveCatalogMovie = createCatalogSaver();
