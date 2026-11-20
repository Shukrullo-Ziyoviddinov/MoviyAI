import {findMovieFromImages} from './image-movie.service.js';
import {CHAT_VIDEO} from '../config/chat-video.config.js';
import type {ChatImageUrl} from '../types/movie-search.types.js';
import type {ChatProgress} from '../types/chat-progress.types.js';
import {validateVideoUrl} from '../video-import/services/video-url.service.js';
export function findMovieFromVideo(text:string,videos:ChatImageUrl[],onDelta?:(text:string)=>void,onProgress?:ChatProgress){
 if(videos.length!==1||!videos[0].mimeType.startsWith('video/'))throw Error('INVALID_CHAT_VIDEO');
 const video=videos[0];
 if(video.analysisSeconds!==undefined){
  const source=validateVideoUrl(video.fileUri);
  if(source.platform!=='youtube'||source.needsResolution||!Number.isFinite(video.analysisSeconds)||video.analysisSeconds<=0||video.analysisSeconds>CHAT_VIDEO.maxSeconds)throw Error('INVALID_CHAT_VIDEO');
 }else if(!Number.isFinite(video.durationSeconds)||!video.durationSeconds||video.durationSeconds<=0||video.durationSeconds>CHAT_VIDEO.maxSeconds)throw Error('INVALID_CHAT_VIDEO');
 return findMovieFromImages(text,videos,onDelta,undefined,undefined,onProgress);
}
