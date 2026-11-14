import {CATALOG_CATEGORIES} from '../ai/catalog/config/catalog-reference.config.js';
/** Admin form parsing shares the nullable catalogue contract. Empty is not zero. */
export function parseMovieFields(payload:Record<string,unknown>,allowMissingTitle=false){
 const object=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const text=(value:unknown)=>value==null||String(value).trim()===''?null:String(value).trim();
 const list=(value:unknown)=>(Array.isArray(value)?value:String(value??'').split(',')).map(text).filter((item):item is string=>!!item);
 const number=(value:unknown,kind:'year'|'duration'|'rating')=>{
  if(value==null||typeof value==='string'&&!value.trim())return null;
  if(typeof value!=='string'&&typeof value!=='number')throw Error('INVALID_NUMBER');
  const result=Number(value);
  if(!Number.isFinite(result)||kind==='rating'&&(result<0||result>10)||kind==='duration'&&(!Number.isInteger(result)||result<=0||result>10000)||kind==='year'&&(!Number.isInteger(result)||result<1880||result>new Date().getUTCFullYear()+5))throw Error('INVALID_NUMBER');
  return result;
 };
 const ids=(value:unknown)=>[...new Set((Array.isArray(value)?value:[]).map(Number).filter(id=>Number.isSafeInteger(id)&&id>0))];
 const title=object(payload.title),uzTitle=text(title.uz),ruTitle=text(title.ru);
 if(!allowMissingTitle&&!uzTitle&&!ruTitle)throw Error('TITLE_REQUIRED');
 const categoryName=text(payload.categoryName);if(categoryName&&!CATALOG_CATEGORIES.some(category=>category===categoryName))throw Error('INVALID_CATEGORY');
 const description=object(payload.description),uz=object(description.uz),ru=object(description.ru),specs=object(payload.specs);
 const sameNumber=(values:unknown[],kind:'year'|'duration')=>{
  const known=values.map(value=>number(value,kind)).filter((value):value is number=>value!==null);
  if(new Set(known).size>1)throw Error('CONFLICTING_NUMBERS');return known[0]??null;
 };
 const year=sameNumber([specs.year,uz.year,ru.year],'year'),duration=sameNumber([specs.duration,uz.duration,ru.duration],'duration');
 const locale=(row:Record<string,unknown>)=>({text:text(row.text),year,country:text(row.country),duration,director:text(row.director)});
 return {categoryName,title:{uz:uzTitle,ru:ruTitle},ratingImdb:number(payload.ratingImdb,'rating'),ratingKinopoisk:number(payload.ratingKinopoisk,'rating'),
  genre:{uz:list(object(payload.genre).uz),ru:list(object(payload.genre).ru)},description:{uz:locale(uz),ru:locale(ru)},
  trailers:text(payload.trailers),watchUrl:text(payload.watchUrl),...(payload.watchUrls!==undefined?{watchUrls:list(payload.watchUrls)}:{}),filterCountry:text(payload.filterCountry),filterGenre:list(payload.filterGenre),
  like:text(payload.like)||'0',dislike:text(payload.dislike)||'0',specs:{year,duration,ageRating:text(specs.ageRating),countries:list(specs.countries)},franchiseMovieIds:ids(payload.franchiseMovieIds),actorIds:ids(payload.actorIds)};
}
