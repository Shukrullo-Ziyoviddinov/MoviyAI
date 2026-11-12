import { Movie } from '../../../models/Movie.js';
import { Actor } from '../../../models/Actor.js';
import { withCatalogTransaction, allocateCatalogId } from '../../../services/catalog-transaction.service.js';
import { createCatalogMatchRepository } from './catalog-match.repository.js';
import { createCatalogReferenceRepository } from './catalog-reference.repository.js';
import { createCatalogMatcher, catalogMatcher,actorIdentityForInsert } from '../services/catalog-match.service.js';
import {ActorEnrichmentJob} from '../models/actor-enrichment-job.model.js';
import {catalogNameKeys} from '../utils/catalog-identity.js';
import { catalogReferenceRepository } from './catalog-reference.repository.js';
import type { CatalogSaveRepository } from '../types/catalog-save.types.js';
import {mergeMissing,missingValuePaths} from '../utils/catalog-merge-missing.js';
import {prepareMovieUpdate} from '../utils/catalog-movie-update.js';
import {hasCoreMovieFacts} from '../../services/movie-source-research.service.js';

let actorQueueReady:Promise<unknown>|undefined;
export const catalogSaveRepository: CatalogSaveRepository = {
  matcher: catalogMatcher,
  references: () => catalogReferenceRepository.load(),
  async transaction(work) {
    actorQueueReady??=ActorEnrichmentJob.createCollection().catch(error=>{actorQueueReady=undefined;throw error;});
    await actorQueueReady;
    return withCatalogTransaction(session => work({
      matcher: createCatalogMatcher(createCatalogMatchRepository(session)),
      references: () => createCatalogReferenceRepository(session).load(),
      nextId: kind => allocateCatalogId(kind, session),
      async updateExistingMovie(id,payload,research){
        const row=await Movie.findOne({id}).select('+catalogResearch').session(session).lean();if(!row)throw Error('MOVIE_NOT_FOUND');
        const {merged,updates}=prepareMovieUpdate(row,payload);
        const result=mergeMissing(row.catalogResearch?.result??research,research);
        result.sourceResearchComplete=hasCoreMovieFacts(result.details);
        await Movie.updateOne({id},{$set:{...updates,'catalogResearch.result':result,'catalogResearch.missingFields':missingValuePaths(merged)}},{session});
      },
      async verifyActorIdentity(id,input){
        // Only called after the transactional matcher has established identity.
        const identity=actorIdentityForInsert(input);
        const row=await Actor.findOne({id}).session(session).lean();if(!row)return;
        await Actor.updateOne({id},{$set:{catalogIdentity:{...(row.catalogIdentity??{}),...identity,
          nameKeys:catalogNameKeys([row.actorName,...(row.catalogIdentity?.nameKeys??[]),...(identity.nameKeys??[])]),
          creditKeys:[...new Set([...(row.catalogIdentity?.creditKeys??[]),...(identity.creditKeys??[])])],
        },'catalogResearch.identityVerification':{sources:input.sources,credit:input.credit,profile:input.profile,verifiedAt:new Date()}}},{session});
      },
      async enqueueActors(movieId,draft){
        await ActorEnrichmentJob.updateOne({_id:String(movieId)},{$setOnInsert:{movieId,draft,status:'pending',attempts:0,nextAttemptAt:new Date(Date.now()+15*60*1000)}},{upsert:true,session});
        await ActorEnrichmentJob.updateOne({_id:String(movieId),status:{$in:['pending','retry','paused']}},{$set:{draft,status:'pending',attempts:0,nextAttemptAt:new Date(Date.now()+15*60*1000)}},{session});
      },
      async movieExists(movieId){return !!await Movie.exists({id:movieId}).session(session);},
      async linkActors(movieId,actorIds,pending){await Movie.updateOne({id:movieId},{$addToSet:{actorIds:{$each:actorIds}},$set:{'catalogResearch.pendingActors':pending},...(actorIds.length?{$pull:{'catalogResearch.missingFields':'actorIds'}}:{})},{session});},
      async insertActor(input) {
        await Actor.create([{ ...input.payload, id: input.id, catalogIdentity: input.identity, catalogResearch: input.research, catalogMediaKeys: input.mediaKeys }], { session });
      },
      async insertMovie(input) {
        await Movie.create([{ ...input.payload, id: input.id, catalogIdentity: input.identity, catalogResearch: input.research, catalogPosters: input.posters, catalogMediaKeys: input.mediaKeys }], { session });
      },
      async linkFranchise(movieId, relatedIds) {
        if (relatedIds.length) await Movie.updateMany({ id: { $in: relatedIds } }, { $addToSet: { franchiseMovieIds: movieId } }, { session });
      },
      async unreferencedMedia(keys) {
        if (!keys.length) return [];
        const movies = await Movie.find({ catalogMediaKeys: { $in: keys } }).select('+catalogMediaKeys').session(session).lean();
        const actors = await Actor.find({ catalogMediaKeys: { $in: keys } }).select('+catalogMediaKeys').session(session).lean();
        const used = new Set([...movies, ...actors].flatMap(row => row.catalogMediaKeys ?? []));
        return keys.filter(key => !used.has(key));
      },
    }));
  },
};
