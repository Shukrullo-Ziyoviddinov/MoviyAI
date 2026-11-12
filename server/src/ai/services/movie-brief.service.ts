import {searchImages} from './serper.service.js';
import {findUzbekMovieLinks,uzbekReleaseTitle} from './uzbek-movie.service.js';
import {selectWorkingPosters} from './movie-poster-probe.js';
import {emptyDossier} from './movie-dossier.js';
import type {MovieSearchResult} from '../types/movie-search.types.js';
import {isPublicHttpsUrl} from '../catalog/validators/catalog.validator.js';

export function renderBriefMovie(movie:MovieSearchResult){
 const language=movie.language??'uz';const labels={uz:{about:'Kino haqida',confirm:'Siz izlagan kino shumi?'},ru:{about:'О фильме',confirm:'Это фильм, который вы искали?'},en:{about:'About the film',confirm:'Is this the film you were looking for?'}}[language];
 const synopsis=movie.details?.synopsis.value?.trim();
 return [`### ${labels.about}`,synopsis?synopsis.slice(0,600):`${movie.title}${movie.year?` (${movie.year})`:''}`,labels.confirm].join('\n\n');
}
export async function briefMovieResponse(input:MovieSearchResult,signal:AbortSignal,deps={searchImages,findLinks:findUzbekMovieLinks,select:selectWorkingPosters}){
 const movie=structuredClone(input);movie.presentation='brief';movie.trailer=null;movie.catalogPortraits=[];
 const linksTask=movie.uzbekLinks?.length?Promise.resolve(movie.uzbekLinks):deps.findLinks(movie).catch(()=>[]);
 if(!movie.posters.length){
  try{
   for(let attempt=0;attempt<2&&!movie.posters.length&&!signal.aborted;attempt++){
    const result=await deps.searchImages(`${attempt?'"'+movie.title+'"':movie.title} ${movie.year??''} ${attempt?'theatrical':'official'} movie poster -fanart -site:instagram.com -site:facebook.com`,{num:10});
    const candidates=(result.images??[]).filter(image=>{const years=image.title?.match(/\b(?:19|20)\d{2}\b/g)??[];return isPublicHttpsUrl(image.imageUrl)&&(!movie.year||!years.length||years.some(year=>Number(year)===movie.year))&&(!image.imageWidth||image.imageWidth>=250)&&(!image.imageHeight||image.imageHeight>=350);}).map(image=>({url:image.imageUrl,sourceUrl:image.link&&isPublicHttpsUrl(image.link)?image.link:null}));
    movie.posters=await deps.select(candidates,signal);
   }
  }catch{ /* Identification survives optional poster service failure. */ }
 }
 movie.uzbekLinks=await linksTask;movie.titleUz=uzbekReleaseTitle(movie.uzbekLinks)??movie.titleUz;
 movie.details??=emptyDossier();
 return {text:renderBriefMovie(movie),movie};
}
