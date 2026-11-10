import {actorMatchInput,actorIdentityForInsert} from './catalog-match.service.js';
import {catalogActorPayloadSchema} from '../validators/catalog.validator.js';
import {catalogFailureDetails} from '../utils/catalog-diagnostics.js';
import type {CatalogActorDraft} from '../types/catalog.types.js';
import type {CatalogSaveMedia,CatalogSaveTransaction} from '../types/catalog-save.types.js';
import type {CatalogAsset} from './catalog-media.service.js';
export interface StagedActor {actor:CatalogActorDraft;image?:CatalogAsset}
export async function stageCatalogActors(actors:CatalogActorDraft[],matcher:CatalogSaveTransaction['matcher'],media:CatalogSaveMedia,track:(key:string)=>void,signal:AbortSignal){
 const staged:StagedActor[]=[];
 for(const input of actors.slice(0,5)){
  if(signal.aborted)break;const actor=structuredClone(input);actor.existingId=null;
  try{
   const match=await matcher.actor(actorMatchInput(actor));
   if(match.status==='existing'){actor.existingId=match.id;staged.push({actor});continue;}
   if(match.status!=='not-found'||!actor.imageCandidates?.length)continue;
   if(!catalogActorPayloadSchema.safeParse({actorName:actor.actorName,actorAbout:actor.actorAbout,actorImg:'/img/validated.jpg'}).success)continue;
   const images=await media.store('actorimg',actor.imageCandidates.map(row=>row.url),1,track,signal);
   if(images[0])staged.push({actor,image:images[0]});
  }catch(error){if(signal.aborted)break;console.warn('[AI_CATALOG_ACTOR]',{event:'deferred',...catalogFailureDetails(error)});}
 }
 return staged;
}
export async function commitCatalogActors(staged:StagedActor[],tx:CatalogSaveTransaction){
 const resolved:CatalogActorDraft[]=[];
 for(const item of staged){
  const actor=structuredClone(item.actor),input=actorMatchInput(actor),match=await tx.matcher.actor(input);
  if(match.status==='needs-research'||match.status==='conflict')continue;
  if(match.status==='existing'){
   actor.existingId=match.id;
   if(tx.verifyActorIdentity)await tx.verifyActorIdentity(match.id,input);
  }else{
   if(!item.image)continue;
   const payload=catalogActorPayloadSchema.parse({actorName:actor.actorName,actorAbout:actor.actorAbout,actorImg:item.image.path});
   actor.existingId=await tx.nextId('actor');
   await tx.insertActor({id:actor.existingId,payload,identity:actorIdentityForInsert(input),research:{...actor,actorImg:item.image.path,storedAsset:item.image},mediaKeys:[item.image.key]});
  }
  resolved.push(actor);
 }
 return resolved;
}
