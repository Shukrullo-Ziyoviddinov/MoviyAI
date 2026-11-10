import {ActorEnrichmentJob} from '../models/actor-enrichment-job.model.js';
import {Movie} from '../../../models/Movie.js';
import {catalogSaveRepository} from '../repositories/catalog-save.repository.js';
import {catalogMediaService} from './catalog-media.service.js';
import {enrichCatalogDraft} from './catalog-enrichment.service.js';
import {stageCatalogActors,commitCatalogActors} from './catalog-actor-save.service.js';
import {catalogFailureDetails} from '../utils/catalog-diagnostics.js';
import {randomUUID} from 'node:crypto';
import type {CatalogDraft} from '../types/catalog.types.js';

export function createActorBackfillProcessor(deps={repository:catalogSaveRepository,media:catalogMediaService,enrich:enrichCatalogDraft}){
 return async function process(movieId:number,input:CatalogDraft,signal:AbortSignal,checkpoint:(draft:CatalogDraft)=>Promise<void>){
  const tracked:string[]=[];
  try{
   const exists=await deps.repository.transaction(async tx=>{if(!tx.movieExists||!tx.linkActors)throw new Error('ACTOR_LINK_REPOSITORY_REQUIRED');return tx.movieExists(movieId);});
   if(!exists)return {completed:true,draft:input};
   const draft=await deps.enrich(input,{movie:input.research,language:input.language,actorImages:[]},signal,checkpoint,true);
   signal.throwIfAborted();
   const staged=await stageCatalogActors(draft.actors,deps.repository.matcher,deps.media,key=>tracked.push(key),signal);
   signal.throwIfAborted();
   const pending=await deps.repository.transaction(async tx=>{
    if(!tx.movieExists||!tx.linkActors)throw new Error('ACTOR_LINK_REPOSITORY_REQUIRED');
    if(tx.movieExists&&!await tx.movieExists(movieId))return [];
    const actors=await commitCatalogActors(staged,tx),ids=[...new Set(actors.map(actor=>actor.existingId!))];
    const remaining=draft.actors.filter(actor=>!actors.some(saved=>saved.actorName===actor.actorName&&saved.originalName===actor.originalName));
    await tx.linkActors(movieId,ids,remaining);
    return remaining;
   });
   // Failed image candidates are researched again on a later backfill attempt.
   const next={...draft,actors:pending.map(actor=>({...actor,imageCandidates:undefined}))};
   return {completed:pending.length===0&&draft.actors.length>0,draft:next};
  }finally{
   if(tracked.length)try{
    const unused=await deps.repository.transaction(tx=>tx.unreferencedMedia(tracked));
    for(const key of unused)try{await deps.media.remove(key);}catch{console.warn('[AI_CATALOG_ACTORS]',{event:'cleanup-deferred'});}
   }catch{console.warn('[AI_CATALOG_ACTORS]',{event:'cleanup-deferred'});}
  }
 };
}
const process=createActorBackfillProcessor();
let running=false;
/** Durable independent jobs never change a completed movie-save job back to failed. */
export async function runActorBackfillOnce(){
 if(running)return;running=true;
 try{
  const now=new Date(),token=randomUUID();
  await ActorEnrichmentJob.updateMany({status:'processing',leaseUntil:{$lte:now},attempts:{$gte:5}},{$set:{status:'paused',leaseToken:'',leaseUntil:new Date(0)}});
  const job=await ActorEnrichmentJob.findOneAndUpdate({attempts:{$lt:5},$or:[{status:{$in:['pending','retry']},nextAttemptAt:{$lte:now}},{status:'processing',leaseUntil:{$lte:now}}]},
   {$set:{status:'processing',leaseToken:token,leaseUntil:new Date(Date.now()+600000)},$inc:{attempts:1}},{sort:{nextAttemptAt:1},returnDocument:'after'}).lean();
  if(!job)return;
  if(!await Movie.exists({id:job.movieId})){await ActorEnrichmentJob.updateOne({_id:job._id,leaseToken:token},{$set:{status:'completed',leaseToken:'',leaseUntil:new Date(0)}});return;}
  const controller=new AbortController();
  const heartbeat=setInterval(()=>{void ActorEnrichmentJob.updateOne({_id:job._id,leaseToken:token,status:'processing'},{$set:{leaseUntil:new Date(Date.now()+600000)}}).then(result=>{if(!result.matchedCount)controller.abort();}).catch(()=>controller.abort());},30000);heartbeat.unref();
  const checkpoint=async(draft:CatalogDraft)=>{controller.signal.throwIfAborted();const r=await ActorEnrichmentJob.updateOne({_id:job._id,leaseToken:token,status:'processing'},{$set:{draft}});if(!r.matchedCount){controller.abort();throw new Error('ACTOR_LEASE_LOST');}};
  try{
   const result=await process(job.movieId,job.draft as CatalogDraft,controller.signal,checkpoint);
   controller.signal.throwIfAborted();
   const status=result.completed?'completed':job.attempts>=5?'paused':'retry';
   await ActorEnrichmentJob.updateOne({_id:job._id,leaseToken:token,status:'processing'},{$set:{draft:result.draft,status,nextAttemptAt:new Date(Date.now()+3600000),leaseToken:'',leaseUntil:new Date(0)}});
   console.info('[AI_CATALOG_ACTORS]',{event:status,movieId:job.movieId,attempt:job.attempts,pending:result.draft.actors.length});
  }catch(error){
   await ActorEnrichmentJob.updateOne({_id:job._id,leaseToken:token,status:'processing'},{$set:{status:job.attempts>=5?'paused':'retry',nextAttemptAt:new Date(Date.now()+3600000),leaseToken:'',leaseUntil:new Date(0)}});
   console.warn('[AI_CATALOG_ACTORS]',{event:'deferred',movieId:job.movieId,...catalogFailureDetails(error)});
  }finally{clearInterval(heartbeat);}
 }catch(error){console.warn('[AI_CATALOG_ACTORS]',{event:'worker-unavailable',...catalogFailureDetails(error)});}
 finally{running=false;}
}
