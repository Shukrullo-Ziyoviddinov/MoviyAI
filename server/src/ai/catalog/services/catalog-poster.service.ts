import {searchImages} from '../../services/serper.service.js';
import {isPublicHttpsUrl} from '../validators/catalog.validator.js';
import type {CatalogSaveMedia} from '../types/catalog-save.types.js';

/** A URL is only a candidate. Completion requires actual validated bytes stored in R2. */
export async function storeMoviePosters(media:CatalogSaveMedia,film:{originalTitle:string;year:number|null},urls:string[],track:(key:string)=>void,signal:AbortSignal,search=searchImages){
 try{if(urls.length)return await media.store('movieimg',urls,2,track,signal);}catch{signal.throwIfAborted();}
 const result=await search(`${film.originalTitle} ${film.year??''} official movie poster -site:instagram.com -site:facebook.com`,{num:10});
 const candidates=(result.images??[]).filter(image=>{
  const years:string[]=image.title.match(/\b(?:19|20)\d{2}\b/g)??[];
  return isPublicHttpsUrl(image.imageUrl)&&!urls.includes(image.imageUrl)&&(!film.year||!years.length||years.includes(String(film.year)))&&(!image.imageWidth||image.imageWidth>=250)&&(!image.imageHeight||image.imageHeight>=350);
 }).map(image=>image.imageUrl).slice(0,7);
 if(!candidates.length)throw Error('CATALOG_POSTER_RESEARCH_REQUIRED');
 return media.store('movieimg',candidates,2,track,signal);
}
