import {Schema,model} from 'mongoose';
const schema=new Schema({
 _id:{type:String,required:true},movieId:{type:Number,required:true,index:true},draft:{type:Schema.Types.Mixed,required:true},
 status:{type:String,enum:['pending','processing','retry','paused','completed'],default:'pending'},attempts:{type:Number,default:0},
 nextAttemptAt:{type:Date,default:Date.now},leaseToken:{type:String,default:''},leaseUntil:{type:Date,default:new Date(0)},
},{timestamps:true,collection:'ai_actor_enrichment_jobs'});
schema.index({status:1,nextAttemptAt:1,leaseUntil:1});
export const ActorEnrichmentJob=model('AiActorEnrichmentJob',schema);
