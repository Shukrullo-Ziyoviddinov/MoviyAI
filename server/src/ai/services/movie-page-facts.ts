import {emptyDossier} from './movie-dossier.js';
import type {MovieDetails,MovieSource} from '../types/movie-dossier.types.js';

const key=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&(?:amp;)?/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const text=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:0?39|x27);/gi,"'").replace(/\s+/g,' ').trim():'';
const list=(value:unknown):string[]=>[...new Set((Array.isArray(value)?value:[value]).map(item=>text(typeof item==='object'&&item!==null?(item as {name?:unknown}).name:item)).filter(Boolean))];

/** Read literal Movie JSON-LD facts only after title AND release year match. No AI guesses or third-party API required. */
export function readStructuredMovieFacts(html:string,source:MovieSource,film:{title:string;year:number|null}):MovieDetails|null{
 if(!film.year)return null;
 const nodes:Record<string,unknown>[]=[];
 function visit(value:unknown,depth=0){if(depth>6||nodes.length>=100)return;if(Array.isArray(value)){for(const item of value)visit(item,depth+1);}else if(value&&typeof value==='object'){const row=value as Record<string,unknown>;nodes.push(row);visit(row['@graph'],depth+1);visit(row.mainEntity,depth+1);}}
 for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(match[1]));}catch{/* Malformed page markup is not evidence. */}
 const row=nodes.find(item=>(Array.isArray(item['@type'])?item['@type']:[item['@type']]).includes('Movie')&&[item.name,item.alternateName].flat().some(name=>typeof name==='string'&&key(text(name))===key(film.title))&&Number(text(item.datePublished).slice(0,4))===film.year);
 if(!row)return null;
 const details=emptyDossier(),sources=[{title:source.title,url:source.url}];
 const fact=<T>(value:T)=>({value,sources});
 for(const [field,value] of [['countries',list(row.countryOfOrigin)],['genres',list(row.genre)],['directors',list(row.director)],['writers',list(row.author??row.creator)]] as const)if(value.length)details[field]=fact(value.slice(0,8));
 const synopsis=text(row.description);if(synopsis)details.synopsis=fact(synopsis.slice(0,2400));
 const duration=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(text(row.duration));
 if(duration){const minutes=Number(duration[1]??0)*60+Number(duration[2]??0)+Number(duration[3]??0)/60;if(minutes>=1&&minutes<=1500)details.runtimeMinutes=fact(Math.round(minutes));}
 const date=text(row.datePublished);if(/^\d{4}-\d{2}-\d{2}$/.test(date))details.premiere=fact(date);
 const age=text(row.contentRating);if(/^(?:PG-13|NC-17|PG|G|R|(?:0|6|12|16|18)\+)$/.test(age))details.ageRating=fact(age);
 details.cast=list(row.actor).slice(0,5).map(name=>({name,originalName:name,role:null,sources}));
 const rating=row.aggregateRating as {ratingValue?:unknown;bestRating?:unknown}|undefined;
 const score=Number(rating?.ratingValue),scale=Number(rating?.bestRating);
 const url=new URL(source.url);
 if(scale===10&&Number.isFinite(score)&&score>=0&&score<=10){if(/(^|\.)imdb\.com$/.test(url.hostname)&&/^\/title\/tt\d+/.test(url.pathname))details.imdb=fact(score);if(/(^|\.)kinopoisk\.ru$/.test(url.hostname)&&/^\/(film|series)\/\d+/.test(url.pathname))details.kinopoisk=fact(score);}
 return details;
}
