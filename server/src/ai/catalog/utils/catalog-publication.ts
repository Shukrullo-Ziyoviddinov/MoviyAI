import type {CatalogMoviePayload,CatalogIssue} from '../types/catalog.types.js';

/** Ratings, budgets and unresolved actors can be unavailable; a title-only catalogue entry is never complete. */
export function catalogPublicationIssues(movie:CatalogMoviePayload):CatalogIssue[]{
 const fields:Record<string,unknown>={categoryName:movie.categoryName,homeImgPoster:movie.homeImgPoster,'title.uz':movie.title.uz,'title.ru':movie.title.ru,'genre.uz':movie.genre.uz,'genre.ru':movie.genre.ru,filterCountry:movie.filterCountry,filterGenre:movie.filterGenre,'specs.duration':movie.specs.duration,'specs.year':movie.specs.year,'specs.countries':movie.specs.countries};
 for(const lang of ['uz','ru'] as const)for(const field of ['text','country','director'] as const)fields[`description.${lang}.${field}`]=movie.description[lang][field];
 return Object.entries(fields).filter(([,value])=>value===null||value===undefined||typeof value==='string'&&!value.trim()||Array.isArray(value)&&!value.length).map(([path])=>({path,action:path==='homeImgPoster'?'store-media':'research',blocking:true,message:'Essential catalogue field is missing; retain the draft and retry research.'}));
}
