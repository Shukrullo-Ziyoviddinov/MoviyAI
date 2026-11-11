import {findMovieFromImages} from './image-movie.service.js';
import {CHAT_VIDEO} from '../config/chat-video.config.js';
import type {ChatImageUrl} from '../types/movie-search.types.js';
export function findMovieFromVideo(text:string,videos:ChatImageUrl[],onDelta?:(text:string)=>void){
 if(videos.length!==1||!videos[0].mimeType.startsWith('video/')||!Number.isFinite(videos[0].durationSeconds)||!videos[0].durationSeconds||videos[0].durationSeconds<=0||videos[0].durationSeconds>CHAT_VIDEO.maxSeconds)throw Error('INVALID_CHAT_VIDEO');
 return findMovieFromImages(text,videos,onDelta);
}
