import {findCatalogChatCandidates} from './catalog-chat-lookup.service.js';
import {researchMovieSources,MOVIE_FACT_INSTRUCTION,hasCoreMovieFacts} from './movie-source-research.service.js';
import {dossierSchema,verifiedDossier,emptyDossier} from './movie-dossier.js';
import {GoogleGenAI} from '@google/genai';import {z} from 'zod';
import {AI_CONFIG} from '../config/ai.config.js';
import {findMovieTrailer} from './movie-trailer.service.js';
import type {MovieSearchResult} from '../types/movie-search.types.js';
import type {MovieDetails} from '../types/movie-dossier.types.js';

export type MovieSection='details'|'cast'|'characters'|'trailer';
export function requestedMovieSection(text:string):MovieSection|null{
 const value=text.toLowerCase();
 if(/treyler|triller|trailer|трейлер/u.test(value))return 'trailer';
 if(/qahramon|personaj|character|персонаж|геро/u.test(value))return 'characters';
 if(/akt[oy]r|aktyor|actor|cast|акт[её]р/u.test(value))return 'cast';
 if(/haqida|to['‘’ʻ]?liq|batafsil|reyting|rating|imdb|kinopoisk|jan[er]+|davlati|budjet|davomiy|rejiss|about|details|подроб|рейтинг|жанр|бюджет|режисс/u.test(value))return 'details';
 return null;
}
export function isContextMovieFollowup(text:string,movie:MovieSearchResult):boolean{
 if(!requestedMovieSection(text))return false;
 let remaining=text.toLowerCase();
 for(const name of [movie.title,movie.titleUz,movie.titleRu].filter((name):name is string=>!!name).sort((a,b)=>b.length-a.length))remaining=remaining.replaceAll(name.toLowerCase(),' ');
 remaining=remaining.replace(/\b(?:shu|usha|o['‘’ʻ]?sha|ushbu|bu|uni|uning|kino\w*|film\w*|serial\w*|haqida|to['‘’ʻ]?liq|batafsil|asosiy|aktyor\w*|aktor\w*|actor\w*|cast|qahramon\w*|personaj\w*|character\w*|treyler\w*|triller\w*|trailer\w*|reyting\w*|rating\w*|janr\w*|janer\w*|davlat\w*|budjet\w*|davomiy\w*|rejiss\w*|malumot\w*|ma['‘’ʻ]?lumot\w*|ber\w*|yubor\w*|ko['‘’ʻ]?rsat\w*|top\w*|qidir\w*|qanaqa|qanday|kim\w*|nima|nechi|qancha|menga|ham|iltimos|tell|me|about|the|this|its|movie|show|give|find|details|please)\b/giu,' ');
 remaining=remaining.replace(/\b(?:va|bilan|endi|yana|rasm\w*|ism\w*|nom\w*|necha|nechta|bormi|img|image\w*|picture\w*|photo\w*|imdb|kinopoisk|and|with|who|are|what|of)\b/giu,' ');
 remaining=remaining.replace(/(?:этот|этого|фильм\p{L}*|подроб\p{L}*|трейлер\p{L}*|акт[её]р\p{L}*|персонаж\p{L}*|геро\p{L}*|рейтинг\p{L}*|жанр\p{L}*|бюджет\p{L}*|режисс\p{L}*|покажи|найди|расскажи|про|о н[её]м|его|кто|какой|пожалуйста)/giu,' ');
 return !/[\p{L}\p{N}]/u.test(remaining);
}
export function createMovieFollowup(deps={lookup:findCatalogChatCandidates,research:researchMovieSources,trailer:findMovieTrailer}){
 return async(text:string,previous:MovieSearchResult,onDelta?:(text:string)=>void)=>{
  const section=requestedMovieSection(text)??'details',language=previous.language??'uz';
  let movie=structuredClone(previous);delete movie.linksOnly;movie.presentation=section;
  try{const candidates=await deps.lookup([previous.title,previous.titleUz??'',previous.titleRu??''],previous.year,language);if(candidates.length===1&&(previous.year!==null&&candidates[0].year===previous.year||previous.catalogId!==undefined&&candidates[0].catalogId===previous.catalogId))movie={...candidates[0],language,presentation:section};}catch{/* Keep verified identity if DB lookup is temporarily unavailable. */}
  movie.posters=[];movie.uzbekLinks=[];
  if(section==='trailer'){
   movie.trailer??=await deps.trailer(movie).catch(()=>null);
   const reply=movie.trailer?{uz:'Treyler',ru:'Трейлер',en:'Trailer'}[language]:{uz:'Hozircha mos video topilmadi.',ru:'Подходящее видео пока не найдено.',en:'No matching video was found.'}[language];
   onDelta?.(reply);return {text:reply,movie,model:AI_CONFIG.models.image};
  }
  let details=movie.details??emptyDossier();
  const requested=section==='cast'?['cast']:section==='characters'?['characters']:/imdb|kinopoisk|reyting|rating|рейтинг/i.test(text)?(/imdb/i.test(text)&&!/kinopoisk/i.test(text)?['imdb']:/kinopoisk/i.test(text)&&!/imdb/i.test(text)?['kinopoisk']:['imdb','kinopoisk']):['countries','genres','runtimeMinutes','synopsis','directors','writers','premiere','budget','boxOffice','ageRating','imdb','kinopoisk'];
  const ready=requested.every(field=>{const item=details[field as keyof MovieDetails];if(Array.isArray(item))return item.length>0;if(item&&typeof item==='object'&&'value'in item)return item.value!==null&&item.value!==undefined&&(!Array.isArray(item.value)||item.value.length>0);return false;});
  if(!ready){
   const ai=new GoogleGenAI({apiKey:AI_CONFIG.apiKey,httpOptions:{timeout:30000,retryOptions:{attempts:1}}});
   details=await deps.research(movie,movie.sources,details,async(evidence,known)=>{
    const response=await ai.models.generateContent({model:AI_CONFIG.models.image,contents:JSON.stringify({film:{title:movie.title,year:movie.year},known,sources:evidence.map((source,index)=>({index,...source}))}),config:{systemInstruction:MOVIE_FACT_INSTRUCTION+' Output language: '+language,responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(dossierSchema),maxOutputTokens:8192,abortSignal:AbortSignal.timeout(30000)}});
    return verifiedDossier(dossierSchema.parse(JSON.parse(response.text??'')),evidence);
   },AbortSignal.timeout(90000),requested);
  }
  movie.details=structuredClone(details);movie.trailer=null;
  movie.sourceResearchComplete=hasCoreMovieFacts(details);
  movie.sources=[...movie.sources,...Object.values(details).flatMap(value=>value&&typeof value==='object'&&!Array.isArray(value)&&'sources'in value?value.sources:[]),...details.cast.flatMap(actor=>actor.sources),...(details.characters??[]).flatMap(character=>character.sources)].filter((source,index,all)=>all.findIndex(other=>other.url===source.url)===index);
  const labels={uz:{cast:'Asosiy aktyorlar',characters:'Asosiy qahramonlar',about:'Kino haqida',unknown:'Ishonchli ma’lumot hozircha topilmadi.'},ru:{cast:'Главные актёры',characters:'Главные герои',about:'О фильме',unknown:'Надёжные сведения пока не найдены.'},en:{cast:'Main cast',characters:'Main characters',about:'About the film',unknown:'Reliable details have not been found yet.'}}[language];
  const clean=(value:string)=>value.replace(/[\r\n*_`<>]/g,' ').trim();
  const body=section==='cast'?details.cast.map((actor,index)=>`${index+1}. **${clean(actor.name)}**${actor.role?' — '+clean(actor.role):''}`).join('\n'):section==='characters'?(details.characters??[]).map(item=>`- **${clean(item.name)} (${clean(item.originalName)}):** ${item.description?clean(item.description):''}`).join('\n'):details.synopsis.value;
  const reply=`### ${labels[section==='details'?'about':section]}\n\n${body||labels.unknown}`;
  onDelta?.(reply);return {text:reply,movie,model:AI_CONFIG.models.image};
 };
}
export const movieFollowup=createMovieFollowup();
