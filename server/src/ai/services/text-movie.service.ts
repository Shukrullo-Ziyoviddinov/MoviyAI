import { findMovieFromImages } from './image-movie.service.js';

/** Route explicit named-film lookups to sourced search, not ordinary conversation. */
export function isNamedMovieSearch(text:string):boolean {
 const value=text.toLowerCase().replace(/[‘’ʻ`]/g,"'");
 if(!/\b(?:top\w*|qidir\w*|qider\w*|qeder\w*|izla\w*|find|search|watch)\b|найди|найти|ищи|посмотреть/iu.test(value))return false;
 const name=value.replace(/\b(?:top\w*|qidir\w*|qider\w*|qeder\w*|izla\w*|kino\w*|film\w*|serial\w*|menga|man|shu|shuni|usha|o'sha|ana|bu|buni|iltimos|ber\w*|yaxshi|biror\w*|qandaydir|qiziqarli|tavsiya\w*|o'zbek\w*|uzbek\w*|uzb|dublaj\w*|tilida|havola\w*|link\w*|ham|yana|please|find|search|watch|movie|the|this|it|for|me)\b|найди|найти|ищи|посмотреть|фильм\p{L}*|мне|этот|ссылк\p{L}*/giu,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return /\p{L}{2}/u.test(name);
}

export function findMovieFromText(text:string,onDelta?:(text:string)=>void,signal?:AbortSignal) {
 return findMovieFromImages(text,[],onDelta,signal);
}
