import {searchVideos} from './serper.service.js';
import type {SerperVideoResult} from '../types/serper.types.js';
import type {MovieTrailer} from '../types/movie-trailer.types.js';
export function youtubeVideoId(value:string){
 try{
  const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;
  const host=url.hostname.toLowerCase();let id:string|null=null;
  if(host==='youtu.be')id=url.pathname.split('/')[1];
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host))id=url.pathname==='/watch'?url.searchParams.get('v'):null;
  return id&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
const norm=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function createMovieTrailerSearch(deps={searchVideos}){
 return async function findMovieTrailer(movie:{title:string;titleRu?:string|null;year:number|null}):Promise<MovieTrailer|null>{
  const titles=[movie.title,movie.titleRu].filter((value):value is string=>!!value).map(norm);
  function candidate(video:SerperVideoResult){
   const id=youtubeVideoId(video.link);if(!id)return null;
   const title=norm(video.title);const years:string[]=video.title.match(/\b(?:19|20)\d{2}\b/g)??[];
   if(movie.year&&years.length&&!years.includes(String(movie.year)))return null;
   if(!titles.some(name=>(' '+title+' ').includes(' '+name+' ')))return null;
   if(titles.some(name=>title.startsWith(name+' ')&&/^(?:(?:part|chapter) )?(?:[2-9]|ii|iii|iv|two|three)\b/.test(title.slice(name.length+1))))return null;
   if(/\b(?:fan made|fanmade|concept|parody|fake|ai generated)\b|фанат|парод/i.test(title))return null;
   const discussion=/\b(?:reaction|review)\b|обзор|реакци/i.test(title);
   const trailer=!discussion&&/\b(?:trailer|teaser)\b|трейлер|тизер/i.test(title);
   const studio=/^(?:warner bros|universal pictures|sony pictures|paramount pictures|walt disney|disney|20th century|netflix|marvel entertainment|a24|lionsgate|pixar)\b/.test(norm(video.channel??''));
   return {score:trailer?(studio?100:50):10,video:{videoId:id,url:`https://www.youtube.com/watch?v=${id}`,title:video.title.slice(0,300),channel:video.channel?.slice(0,150)??null,kind:trailer?'trailer' as const:'related' as const}};
  }
  try{
   let first:SerperVideoResult[]=[];
   try{first=(await deps.searchVideos(`site:youtube.com ${movie.title} ${movie.year??''} official trailer -fanmade -concept`,{num:10})).videos??[];}catch{/* A broad fallback may still work. */}
   let candidates=first.map(candidate).filter((item):item is NonNullable<typeof item>=>!!item).sort((a,b)=>b.score-a.score);
   if(candidates[0]?.score===100)return candidates[0].video;
   try{
    const second=(await deps.searchVideos(`site:youtube.com ${movie.title} ${movie.year??''} movie video`,{num:10})).videos??[];
    candidates=[...candidates,...second.map(candidate).filter((item):item is NonNullable<typeof item>=>!!item)].sort((a,b)=>b.score-a.score);
   }catch{/* Keep a valid first-search result. */}
   return candidates[0]?.video??null;
  }catch{return null;}
 };
}
export const findMovieTrailer=createMovieTrailerSearch();
