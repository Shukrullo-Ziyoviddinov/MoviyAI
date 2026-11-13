import { randomUUID, createHash } from 'node:crypto';
import { Conversation, ChatTurn } from '../models/conversation.model.js';
import { chatWithGemma } from './gemma.service.js';
import type { AiHistoryMessage, AiResult } from '../types/ai.types.js';
import type { ChatImageInput, MovieSearchResult } from '../types/movie-search.types.js';
import {findUzbekMovieLinks,isUzbekMovieRequest,uzbekLookupReply,uzbekReleaseTitle} from './uzbek-movie.service.js';
import { findMovieFromImages } from './image-movie.service.js';
import { findMovieFromText, isNamedMovieSearch } from './text-movie.service.js';
import { recommendMovies,isMovieRecommendation,type MovieRecommendation } from './movie-recommendation.service.js';
import {resolveDirectVideo,chatVideoUrls} from './direct-video.service.js';
import {findMovieFromVideo} from './video-movie.service.js';
import { imageReferences, uploadChatImages, chatImageUrls, cleanupConversationImages } from './chat-image-storage.service.js';
import { resolveDirectImages } from './direct-image.service.js';
import { findCharacterImages } from './character-image.service.js';
import { isCatalogEligible } from '../catalog/utils/catalog-chat-input.js';
import { wakeCatalogWorker } from '../catalog/services/catalog-worker.service.js';
import {movieFollowup,isContextMovieFollowup} from './movie-followup.service.js';
import {ChatFailure,chatFailureCode,type ChatProgress,type ChatStage} from '../types/chat-progress.types.js';
function notifyCatalogWorker() {
    try { wakeCatalogWorker(); } catch { console.warn('[AI_CATALOG] Chat saved; background dispatch will retry'); }
}
export class ConversationError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
}
export async function listConversations(userId: string) {
    const rows = await Conversation.find({ userId, deletedAt: null }).sort({ updatedAt: -1 }).select('_id title pinned updatedAt').lean();
    return rows.map(row => ({ id: row._id, title: row.title, pinned: Boolean(row.pinned), updatedAt: row.updatedAt }));
}
export async function createConversation(userId: string, id: string) {
    const existing = await Conversation.findById(id).lean();
    if (existing && (existing.userId !== userId || existing.deletedAt))
        throw new ConversationError('Conversation not found', 404);
    try {
        await Conversation.updateOne({ _id: id, userId }, { $setOnInsert: { title: 'Yangi chat' } }, { upsert: true });
    }
    catch (error) {
        if ((error as {
            code?: number;
        }).code !== 11000)
            throw error;
        if (!await Conversation.exists({ _id: id, userId, deletedAt: null }))
            throw new ConversationError('Conversation not found', 404);
    }
    return getConversation(userId, id);
}
export async function getConversation(userId: string, id: string) {
    const row = await Conversation.findOne({ _id: id, userId, deletedAt: null }).lean();
    if (!row)
        throw new ConversationError('Conversation not found', 404);
    const turns = await ChatTurn.find({ conversationId: id, userId }).select('-images.data').sort({ createdAt: 1, _id: 1 }).lean();
    return {
        id: row._id, title: row.title, pinned: Boolean(row.pinned), updatedAt: row.updatedAt,
        turns: await Promise.all(turns.map(async turn => ({
            requestId: turn.requestId, text: turn.text, answer: turn.answer,
            images: (await chatImageUrls(userId, id, turn.requestId, turn.images)).map((image, index) => ({ id: `${turn.requestId}-${index}`, type: 'image' as const, path: image.fileUri })),
            videos:(await chatVideoUrls(userId,id,turn.requestId,turn.videos??[])).map((video,index)=>({id:`${turn.requestId}-video-${index}`,type:'video' as const,path:video.fileUri,duration:video.durationSeconds})),
            movie: turn.movie ?? null,
            characterImages: turn.characterImages ?? [],
            recommendations: turn.recommendations??[],
            status: turn.status === 'processing' && row.lockUntil <= new Date() ? 'failed' : turn.status,
            progressStage:turn.status==='processing'?turn.progressStage??null:null,
            failureCode:turn.failureCode??null,
            createdAt: turn.createdAt, model: turn.model,
        }))),
    };
}
export async function sendConversationMessage(userId: string, id: string, requestId: string, text: string, onDelta?: (text: string) => void, uploadedImages: ChatImageInput[] = [], directImages = false,directVideo=false,onProgress?:ChatProgress) {
    if(directVideo&&(directImages||uploadedImages.length))throw new ConversationError('Send one video or images separately',400);
    const existing = await ChatTurn.findOne({ userId, conversationId: id, requestId }).lean();
    if (existing && existing.text !== text)
        throw new ConversationError('Request ID already used for another message', 409);
    const images = uploadedImages.map(image => ({ ...image, hash: createHash('sha256').update(image.data).digest('hex') }));
    if (existing && images.length && JSON.stringify((existing.images ?? []).map(image => image.hash)) !== JSON.stringify(images.map(image => image.hash))) {
        throw new ConversationError('Request ID already used for different images', 409);
    }
    if (existing?.status === 'completed') { notifyCatalogWorker(); return getConversation(userId, id); }
    const lockToken = randomUUID();
    let progressWrites=Promise.resolve();
    const progress=(stage:ChatStage)=>{onProgress?.(stage);progressWrites=progressWrites.then(async()=>{await ChatTurn.updateOne({conversationId:id,userId,requestId,attemptToken:lockToken,status:'processing'},{$set:{progressStage:stage}});}).catch(()=>{});};
    const locked = await Conversation.findOneAndUpdate({
        _id: id, userId, deletedAt: null, lockUntil: { $lte: new Date() },
    }, { $set: { lockToken, lockUntil: new Date(Date.now() + 240000) } }, { returnDocument: 'after' });
    if (!locked) {
        if (!await Conversation.exists({ _id: id, userId, deletedAt: null }))
            throw new ConversationError('Conversation not found', 404);
        throw new ConversationError('Conversation is processing another message', 409);
    }
    try {
        // Recheck after acquiring the lock to avoid replaying a just-completed request.
        const replay = await ChatTurn.findOne({ userId, conversationId: id, requestId }).lean();
        if (replay && replay.text !== text)
            throw new ConversationError('Request ID already used for another message', 409);
        if (replay?.status === 'completed') {
            notifyCatalogWorker();
            return getConversation(userId, id);
        }
        // A later message must not bypass an unanswered earlier message.
        if (await ChatTurn.exists({ userId, conversationId: id, requestId: { $ne: requestId }, status: { $ne: 'completed' } })) {
            throw new ConversationError('Retry the unanswered message before sending another', 409);
        }
        const references = directImages ? await resolveDirectImages(userId, id, requestId) : imageReferences(id, requestId, images);
        let videoReferences:Awaited<ReturnType<typeof resolveDirectVideo>>=[];
        if(directVideo)try{videoReferences=await resolveDirectVideo(userId,id,requestId);}catch(error){const code=(error as {message?:string;name?:string}).message??'';if(/^(?:VIDEO_CHANGED|UPLOAD_EXPIRED|INVALID_VIDEO|UNSUPPORTED_VIDEO|VIDEO_DURATION)/.test(code)||(error as {name?:string}).name==='NoSuchKey')throw new ChatFailure('video_unreadable');throw error;}
        if(directVideo&&replay&&JSON.stringify((replay.videos??[]).map(video=>video.hash))!==JSON.stringify(videoReferences.map(video=>video.hash)))throw new ConversationError('Attachments already selected',409);
        if (replay && directImages && JSON.stringify(replay.images.map(image => image.hash)) !== JSON.stringify(references.map(image => image.hash))) throw new ConversationError('Attachments already selected', 409);
        await ChatTurn.updateOne({ conversationId: id, userId, requestId }, {
            $set: { status: 'processing', attemptToken: lockToken,progressStage:null,failureCode:null }, $setOnInsert: { text, images: references,videos:videoReferences },
        }, { upsert: true });
        await Conversation.updateOne({ _id: id, userId, lockToken }, {
            $set: { title: locked.title === 'Yangi chat' ? text.slice(0, 100) : locked.title },
        });
        const previous = await ChatTurn.find({ userId, conversationId: id, status: 'completed' })
            .sort({ createdAt: -1, _id: -1 }).limit(15).lean();
        const history: AiHistoryMessage[] = previous.reverse().flatMap(turn => [
            { role: 'user' as const, text: turn.text }, { role: 'model' as const, text: turn.movie?.title
                ? `${turn.answer}\nIdentified film: ${turn.movie.title} (${turn.movie.year ?? ''})` : `${turn.answer}${turn.recommendations?.length?'\nRecommended films: '+turn.recommendations.map((item:MovieRecommendation)=>`${item.movie.title} (${item.movie.year??''})`).join('; '):''}` },
        ]);
        if (images.length) await uploadChatImages(id, requestId, images);
        const searchImages = await chatImageUrls(userId, id, requestId);
        const searchVideos=await chatVideoUrls(userId,id,requestId);
        if(searchVideos.length&&searchImages.length)throw new ConversationError('Send one video or images separately',400);
        const contextTurn=[...previous].reverse().find(turn=>turn.movie?.title||turn.recommendations?.length);
        const previousMovie=(contextTurn?.movie??(contextTurn?.recommendations?.length===1?contextTurn.recommendations[0].movie:undefined)) as MovieSearchResult|undefined;
        let result:AiResult&{movie?:MovieSearchResult;recommendations?:MovieRecommendation[]};
        if(searchVideos.length){
            result=await findMovieFromVideo(text,searchVideos,onDelta,progress);
        } else if(!searchImages.length&&previousMovie&&isContextMovieFollowup(text,previousMovie)){
            result=await movieFollowup(text,previousMovie,onDelta);
        } else if(!searchImages.length&&isMovieRecommendation(text)) {
            result=await recommendMovies(text,history,onDelta);
        } else if(!searchImages.length&&isNamedMovieSearch(text)) {
            result=await findMovieFromText(text,onDelta);
        } else if(!searchImages.length&&previousMovie&&isUzbekMovieRequest(text)) {
            const uzbekLinks=await findUzbekMovieLinks(previousMovie);
            result={text:uzbekLookupReply(text,uzbekLinks.length>0),model:'uzbek-movie-search',movie:{...previousMovie,titleUz:uzbekReleaseTitle(uzbekLinks)??previousMovie.titleUz,uzbekLinks,linksOnly:true}};
            onDelta?.(result.text);
        } else result = searchImages.length
            ? await findMovieFromImages(text, searchImages, onDelta,undefined,undefined,progress)
            : await chatWithGemma({ text, history }, onDelta);
        if(result.recommendations)await Promise.all(result.recommendations.map(async item=>{
            item.characterImages=await findCharacterImages(item.text,item.movie).catch(()=>[]);
        }));
        const characterImages = result.movie?.linksOnly||result.movie?.presentation==='brief'||result.movie?.presentation==='trailer'||result.movie?.presentation==='details'||result.recommendations?[]:await findCharacterImages(result.text, result.movie).catch(()=>[]);
        if ('movie' in result && result.movie) for (const portrait of characterImages) {
            if (portrait.sourceUrl && !result.movie.sources.some(source=>source.url===portrait.sourceUrl))
                result.movie.sources.push({title:portrait.label,url:portrait.sourceUrl});
        }
        progress('preparing');await progressWrites;
        await ChatTurn.updateOne({ conversationId: id, userId, requestId, attemptToken: lockToken }, {
            $set: { status: 'completed', answer: result.text, model: result.model, movie: 'movie' in result ? result.movie ?? null : null, characterImages,recommendations:result.recommendations??[],
                progressStage:null,failureCode:null,catalogDispatch: isCatalogEligible(result.movie)||result.recommendations?.some(item=>isCatalogEligible(item.movie)) ? 'pending' : 'none' },
        });
        // The outbox flag is committed with the answer. Worker/R2/AI failures
        // cannot change a completed chat turn into a failed generation.
        if (isCatalogEligible(result.movie)||result.recommendations?.some(item=>isCatalogEligible(item.movie))) notifyCatalogWorker();
    }
    catch (error) {
        await progressWrites;
        const failureCode=chatFailureCode(error);
        console.warn('[CHAT_FAILURE]',{failureCode});
        await ChatTurn.updateOne({ conversationId: id, userId, requestId, attemptToken: lockToken, status: 'processing' }, { $set: { status: 'failed',failureCode,progressStage:null } });
        throw error;
    }
    finally {
        await Conversation.updateOne({ _id: id, userId, lockToken }, { $set: { lockToken: '', lockUntil: new Date(0) } });
    }
    return getConversation(userId, id);
}

export async function deleteConversation(userId: string, id: string) {
 const row=await Conversation.findOne({_id:id,userId}).lean();
 if(!row)throw new ConversationError('Conversation not found',404);
 if(!row.deletedAt){
  const removed=await Conversation.findOneAndUpdate({_id:id,userId,deletedAt:null,lockUntil:{$lte:new Date()}},
   {$set:{deletedAt:new Date(),cleanupPending:true,title:'',lockToken:'',lockUntil:new Date(0)}},{returnDocument:'after'});
  if(!removed)throw new ConversationError('Conversation is busy. Try again later.',409);
 }
 // Keep only an empty tombstone so a delayed create retry cannot resurrect a deleted chat.
 await cleanupConversationImages(userId,id);
 return {id};
}

export async function pinConversation(userId: string, id: string, pinned: boolean) {
    const row = await Conversation.findOneAndUpdate({ _id: id, userId, deletedAt: null },
        { $set: { pinned } }, { returnDocument: 'after' });
    if (!row) throw new ConversationError('Conversation not found', 404);
    return { id: row._id, pinned: Boolean(row.pinned) };
}
