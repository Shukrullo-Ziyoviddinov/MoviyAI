import { findMovieFromImages } from './image-movie.service.js';
import type { AiHistoryMessage } from '../types/ai.types.js';
import { isMovieDescription, isMovieDescriptionContinuation, movieUnderstandingPrompt } from './text-movie-understanding.js';

/** Route explicit named-film lookups to sourced search, not ordinary conversation. */
export function isNamedMovieSearch(text:string,history:AiHistoryMessage[]=[]):boolean {
 if(isMovieDescription(text)||isMovieDescriptionContinuation(text,history))return true;
 const value=text.toLowerCase().replace(/[‘’ʻ`]/g,"'");
 if(!/\b(?:top\w*|qidir\w*|qider\w*|qeder\w*|izla\w*|find|search|watch)\b|найди|найти|ищи|посмотреть/iu.test(value))return false;
 const name=value.replace(/\b(?:top\w*|qidir\w*|qider\w*|qeder\w*|izla\w*|kino\w*|film\w*|serial\w*|menga|man|shu|shuni|usha|o'sha|ana|bu|buni|iltimos|ber\w*|yaxshi|biror\w*|qandaydir|qiziqarli|tavsiya\w*|o'zbek\w*|uzbek\w*|uzb|dublaj\w*|tilida|havola\w*|link\w*|ham|yana|please|find|search|watch|movie|the|this|it|for|me)\b|найди|найти|ищи|посмотреть|фильм\p{L}*|мне|этот|ссылк\p{L}*/giu,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return /\p{L}{2}/u.test(name);
}

export function createTextMovieSearch(deps={find:findMovieFromImages}) {
 return (text:string,onDelta?:(text:string)=>void,signal?:AbortSignal,history:AiHistoryMessage[]=[])=>deps.find(movieUnderstandingPrompt(text,history),[],onDelta,signal);
}
export const findMovieFromText=createTextMovieSearch();
