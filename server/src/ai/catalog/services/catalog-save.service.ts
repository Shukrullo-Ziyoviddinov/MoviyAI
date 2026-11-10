import { catalogSaveRepository } from '../repositories/catalog-save.repository.js';
import { catalogMediaService } from './catalog-media.service.js';
import { movieMatchInput, movieIdentityForInsert } from './catalog-match.service.js';
import { resolveCatalogReferences } from './catalog-reference.service.js';
import { assessCatalogDraft } from '../mappers/movie.mapper.js';
import { isPublicHttpsUrl } from '../validators/catalog.validator.js';
import type { CatalogDraft, CatalogIssue } from '../types/catalog.types.js';
import type { CatalogMatchResult } from '../types/catalog-match.types.js';
import type { CatalogSaveMedia, CatalogSaveRepository, CatalogSaveResult, CatalogSaveTransaction } from '../types/catalog-save.types.js';
import {stageCatalogActors,commitCatalogActors} from './catalog-actor-save.service.js';

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
  const allowedLater = (path: string) => path === 'homeImgPoster';
  const movieOnly=structuredClone(draft);movieOnly.actors=[];movieOnly.movie.actorIds=[];
  const issues = assessCatalogDraft(movieOnly).issues.filter(issue => issue.blocking && !allowedLater(issue.path));
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
      preflight(draft);
      await resolveFranchise(draft, repository);
      if (!draft.posterCandidates.length) block('posterCandidates', 'A verified film poster is required.', 'store-media');
      const signal = AbortSignal.timeout(90000);
      const track = (key: string) => tracked.push(key);
      const staged = { posters: await media.store('movieimg', draft.posterCandidates.map(item => item.url), 2, track, signal) };
      const stagedActors=await stageCatalogActors(draft.actors,repository.matcher,media,track,signal);

      const result = await repository.transaction<CatalogSaveResult>(async tx => {
        const duplicate = await tx.matcher.movie(movieMatchInput(draft)); requireKnown(duplicate, 'identity');
        if (duplicate.status === 'existing') return { status: 'existing', movieId: duplicate.id };
        const freshReferences = resolveCatalogReferences(draft, await tx.references());
        if (!freshReferences.ready) throw new SaveBlocked(freshReferences.issues);
        const ready = freshReferences.draft;
        ready.movie.homeImgPoster = staged.posters[0].path; ready.movie.actorIds = [];
        ready.movie.franchiseMovieIds = await resolveFranchise(ready, tx);
        const allActors=ready.actors;
        ready.actors=await commitCatalogActors(stagedActors,tx);
        ready.movie.actorIds=[...new Set(ready.actors.map(actor=>actor.existingId!))];
        const pendingActors=allActors.filter(actor=>!ready.actors.some(saved=>saved.actorName===actor.actorName&&saved.originalName===actor.originalName));
        const assessment = assessCatalogDraft(ready);
        if (!assessment.ready || !assessment.payload) throw new SaveBlocked(assessment.issues.filter(issue => issue.blocking));
        const movieId = await tx.nextId('movie');
        ready.movie.franchiseMovieIds = ready.movie.franchiseMovieIds.filter(id => id !== movieId);
        const payload = { ...assessment.payload, franchiseMovieIds: ready.movie.franchiseMovieIds };
        await tx.insertMovie({ id: movieId, payload, identity: movieIdentityForInsert(movieMatchInput(ready)), research: { result: ready.research, pendingActors, localizedFacts: ready.localizedFacts ?? null, franchiseCandidates: ready.franchiseCandidates ?? [], storedAssets: staged.posters },
          posters: staged.posters.map(image => image.path), mediaKeys: staged.posters.map(image => image.key) });
        await tx.linkFranchise(movieId, payload.franchiseMovieIds);
        if((pendingActors.length||!allActors.length)&&tx.enqueueActors)await tx.enqueueActors(movieId,{...ready,actors:pendingActors});
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
