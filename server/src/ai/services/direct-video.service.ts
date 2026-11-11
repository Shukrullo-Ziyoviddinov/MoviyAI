import {Schema,model} from 'mongoose';
import {Conversation,ChatTurn} from '../models/conversation.model.js';
import {chatVideoKey,signChatImage,inspectChatVideo,deleteChatImage} from '../../services/r2.service.js';
import {CHAT_VIDEO} from '../config/chat-video.config.js';
const schema=new Schema({userId:{type:String,required:true},conversationId:{type:String,required:true},requestId:{type:String,required:true},key:{type:String,required:true},hash:{type:String,required:true},size:{type:Number,required:true},mimeType:{type:String,required:true},expiresAt:{type:Date,required:true}},{collection:'ai_chat_video_uploads',timestamps:true});
schema.index({conversationId:1,requestId:1},{unique:true});schema.index({expiresAt:1});
export const ChatVideoUpload=model('AiChatVideoUpload',schema);
export async function reserveVideo(userId:string,conversationId:string,requestId:string,input:{hash:string;size:number;mimeType:string}){
 if(!/^[a-f0-9]{64}$/.test(input.hash)||input.size<16||input.size>CHAT_VIDEO.maxBytes||!CHAT_VIDEO.mimeTypes.includes(input.mimeType as typeof CHAT_VIDEO.mimeTypes[number]))throw Error('INVALID_VIDEO_METADATA');
 if(!await Conversation.exists({_id:conversationId,userId,deletedAt:null}))throw Error('CONVERSATION_NOT_FOUND');
 const turn=await ChatTurn.findOne({userId,conversationId,requestId}).lean();if(turn&&(turn.images.length||turn.videos?.[0]?.hash!==input.hash))throw Error('ATTACHMENTS_ALREADY_SELECTED');
 const key=chatVideoKey(conversationId,requestId,input.hash);
 await ChatVideoUpload.updateOne({userId,conversationId,requestId},{$setOnInsert:{...input,key,expiresAt:new Date(Date.now()+3600000)}},{upsert:true});
 const row=await ChatVideoUpload.findOne({userId,conversationId,requestId}).lean();
 if(!row||row.expiresAt<=new Date()||row.hash!==input.hash||row.size!==input.size||row.mimeType!==input.mimeType)throw Error('VIDEO_RESERVATION_CHANGED');
 const lifetime=Math.min(300,Math.floor((row.expiresAt.getTime()-Date.now())/1000)-60);if(lifetime<1)throw Error('UPLOAD_EXPIRED');
 return {url:await signChatImage(key,'PUT',input.mimeType,input.size,lifetime),headers:{'Content-Type':input.mimeType,'Cache-Control':'private, no-store'}};
}
export async function resolveDirectVideo(userId:string,conversationId:string,requestId:string){
 const row=await ChatVideoUpload.findOne({userId,conversationId,requestId}).lean();if(!row||row.expiresAt<=new Date())throw Error('UPLOAD_EXPIRED');
 const file=await inspectChatVideo(row.key);if(file.size!==row.size||file.mimeType!==row.mimeType||!Number.isFinite(file.duration)||file.duration<=0||file.duration>CHAT_VIDEO.maxSeconds)throw Error('VIDEO_CHANGED');
 return [{key:row.key,hash:row.hash,size:row.size,mimeType:row.mimeType,duration:file.duration}];
}
export async function chatVideoUrls(userId:string,conversationId:string,requestId:string,saved?:Array<{key:string;hash:string;mimeType:string;duration:number}>){
 const videos=saved??(await ChatTurn.findOne({userId,conversationId,requestId}).lean())?.videos??[];
 return Promise.all(videos.map(async video=>{if(video.key!==chatVideoKey(conversationId,requestId,video.hash))throw Error('INVALID_VIDEO_KEY');return {fileUri:await signChatImage(video.key,'GET'),mimeType:video.mimeType,durationSeconds:video.duration};}));
}
export async function cleanupConversationVideos(userId:string,conversationId:string){
 const reservations=await ChatVideoUpload.find({userId,conversationId}).lean();for(const row of reservations)await deleteChatImage(row.key);
 const turns=await ChatTurn.find({userId,conversationId}).lean();for(const turn of turns)for(const video of turn.videos??[])await deleteChatImage(video.key);
 // Reservation records remain until expiry to clean up any late use of issued PUTs.
}
export async function cleanupExpiredVideos(){
 const rows=await ChatVideoUpload.find({expiresAt:{$lte:new Date()}}).limit(20).lean();
 for(const row of rows)try{
  if(await Conversation.exists({_id:row.conversationId,userId:row.userId,deletedAt:null,lockUntil:{$gt:new Date()}}))continue;
  const active=await Conversation.exists({_id:row.conversationId,userId:row.userId,deletedAt:null});
  const turn=active?await ChatTurn.findOne({userId:row.userId,conversationId:row.conversationId,requestId:row.requestId}).lean():null;
  if(!turn?.videos?.some(video=>video.key===row.key))await deleteChatImage(row.key);
  await ChatVideoUpload.deleteOne({_id:row._id});
 }catch{console.warn('[CHAT_VIDEO_CLEANUP] Cleanup pending');}
}
