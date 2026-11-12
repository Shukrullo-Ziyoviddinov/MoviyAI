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
import {catalogFailureDetails} from '../utils/catalog-diagnostics.js';
import {hasCoreMovieFacts} from '../../services/movie-source-research.service.js';
import {storeMoviePosters} from './catalog-poster.service.js';
import {catalogPublicationIssues} from '../utils/catalog-publication.js';

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
  if (!hasCoreMovieFacts(draft.research.details)) block('research.details', 'Essential film facts are missing; retain the draft for research instead of publishing a title-only movie.');
  const essential=catalogPublicationIssues(draft.movie).filter(issue=>issue.path!=='homeImgPoster');
  if(essential.length)throw new SaveBlocked(essential);
  if (draft.research.linksOnly) block('research.linksOnly', 'A link-only follow-up is not a new film result.');
  const allowedLater = (path: string) => path === 'homeImgPoster';
  const movieOnly=structuredClone(draft);movieOnly.actors=[];movieOnly.movie.actorIds=[];
  const issues = assessCatalogDraft(movieOnly).issues.filter(issue => issue.blocking && !allowedLater(issue.path));
  if (issues.length) throw new SaveBlocked(issues);
}
async function resolveFranchise(draft: CatalogDraft, tx: Pick<CatalogSaveTransaction, 'matcher'>): Promise<number[]> {
  if (draft.movie.franchiseMovieIds.length && !draft.franchiseCandidates?.length) return [];
  const ids: number[] = [];
  for (const candidate of (draft.franchiseCandidates ?? []).slice(0,20)) {
    if (!candidate.relation.value?.trim() || !candidate.relation.sources.some(source => isPublicHttpsUrl(source.url))) continue;
    const match = await tx.matcher.movie(candidate.film);
    if (match.status === 'existing' && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export function createCatalogSaver(deps: { repository: CatalogSaveRepository; media: CatalogSaveMedia; posterSearch?:Parameters<typeof storeMoviePosters>[5] } = { repository: catalogSaveRepository, media: catalogMediaService }) {
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
      const references = resolveCatalogReferences(input, await repository.references(),{allowMissing:true});
      if (!references.ready) throw new SaveBlocked(references.issues);
      const draft = references.draft;
      draft.movie.actorIds = [];
      preflight(draft);
      await resolveFranchise(draft, repository);
      const signal = AbortSignal.timeout(90000);
      const track = (key: string) => tracked.push(key);
      const staged:{posters:Awaited<ReturnType<CatalogSaveMedia['store']>>}={posters:[]};
      try{staged.posters=await storeMoviePosters(media,draft.identity,draft.posterCandidates.map(item=>item.url),track,signal,deps.posterSearch);}
      catch(error){console.warn('[AI_CATALOG]',{event:'poster-unavailable',...catalogFailureDetails(error)});}
      if(!staged.posters.length)block('homeImgPoster','No verified downloadable poster was stored in R2.','store-media');
      const stagedActors=await stageCatalogActors(draft.actors,repository.matcher,media,track,signal);

      const result = await repository.transaction<CatalogSaveResult>(async tx => {
        const duplicate = await tx.matcher.movie(movieMatchInput(draft)); requireKnown(duplicate, 'identity');
        if (duplicate.status === 'existing') return { status: 'existing', movieId: duplicate.id };
        const freshReferences = resolveCatalogReferences(draft, await tx.references(),{allowMissing:true});
        if (!freshReferences.ready) throw new SaveBlocked(freshReferences.issues);
        const ready = freshReferences.draft;
        ready.movie.homeImgPoster = staged.posters[0]?.path??null; ready.movie.actorIds = [];
        const essential=catalogPublicationIssues(ready.movie);if(essential.length)throw new SaveBlocked(essential);
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
        function missing(value:unknown,path=''):string[]{
          if(value===null||Array.isArray(value)&&!value.length)return [path];
          if(value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).flatMap(([key,item])=>missing(item,path?`${path}.${key}`:key));
          return [];
        }
        const missingFields=missing(payload);
        await tx.insertMovie({ id: movieId, payload, identity: movieIdentityForInsert(movieMatchInput(ready)), research: { result: ready.research, pendingActors, missingFields, localizedFacts: ready.localizedFacts ?? null, franchiseCandidates: ready.franchiseCandidates ?? [], storedAssets: staged.posters },
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
