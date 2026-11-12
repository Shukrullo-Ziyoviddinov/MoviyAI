import {prepareCatalogDraft} from '../mappers/movie.mapper.js';
import {catalogSaveRepository} from '../repositories/catalog-save.repository.js';
import {enrichCatalogDraft} from './catalog-enrichment.service.js';
import {resolveCatalogReferences} from './catalog-reference.service.js';
import {ensureCatalogDictionary} from './catalog-dictionary.service.js';
import {movieMatchInput} from './catalog-match.service.js';
import {catalogMoviePayloadSchema} from '../validators/catalog.validator.js';
import {stageCatalogActors,commitCatalogActors} from './catalog-actor-save.service.js';
import {catalogMediaService} from './catalog-media.service.js';
import type {CatalogChatInput} from '../types/catalog-job.types.js';
import type {CatalogSaveResult} from '../types/catalog-save.types.js';
import type {CatalogDraft} from '../types/catalog.types.js';
import {hasCoreMovieFacts} from '../../services/movie-source-research.service.js';

/** Existing films receive missing facts; IDs, known values and stored posters stay intact. */
export async function refreshCatalogMovie(movieId:number,input:CatalogChatInput,signal:AbortSignal,previous?:CatalogDraft|null,checkpoint: (draft:CatalogDraft)=>Promise<void>=async()=>{}):Promise<CatalogSaveResult>{
 let draft=previous?structuredClone(previous):prepareCatalogDraft(input.movie,{language:input.language});
 draft=await enrichCatalogDraft(draft,input,signal,async next=>{draft=structuredClone(next);await checkpoint(draft);});
 let refs=await catalogSaveRepository.references();
 if(resolveCatalogReferences(draft,refs).issues.some(issue=>issue.kind==='missing'))try{refs=await ensureCatalogDictionary(draft,signal);}catch{signal.throwIfAborted();}
 draft=resolveCatalogReferences(draft,refs,{allowMissing:true}).draft;
 await checkpoint(draft);
 const tracked:string[]=[];
 try{
  const staged=await stageCatalogActors(draft.actors,catalogSaveRepository.matcher,catalogMediaService,key=>tracked.push(key),signal);
  return await catalogSaveRepository.transaction(async tx=>{
   if(!tx.updateExistingMovie||!tx.linkActors)throw Error('MOVIE_REFRESH_REPOSITORY_REQUIRED');
   const match=await tx.matcher.movie(movieMatchInput(draft));if(match.status!=='existing'||match.id!==movieId)throw Error('MOVIE_REFRESH_IDENTITY_CHANGED');
   const fresh=resolveCatalogReferences(draft,await tx.references(),{allowMissing:true}).draft;
   const actors=await commitCatalogActors(staged,tx),pending=fresh.actors.filter(actor=>!actors.some(saved=>saved.actorName===actor.actorName&&saved.originalName===actor.originalName));
   fresh.movie.actorIds=actors.map(actor=>actor.existingId!);
   await tx.updateExistingMovie(movieId,catalogMoviePayloadSchema.parse(fresh.movie),fresh.research);
   await tx.linkActors(movieId,fresh.movie.actorIds,pending);
   if(pending.length&&tx.enqueueActors)await tx.enqueueActors(movieId,{...fresh,actors:pending});
   const result:CatalogSaveResult=hasCoreMovieFacts(fresh.research.details)?{status:'existing',movieId}:{status:'needs-enrichment',issues:[{path:'research.details',action:'research',blocking:false,message:'Available facts were saved; essential movie facts still need research.'}]};
   return result;
  });
 }finally{
  if(tracked.length){const unused=await catalogSaveRepository.transaction(tx=>tx.unreferencedMedia(tracked));for(const key of unused)await catalogMediaService.remove(key);}
 }
}
