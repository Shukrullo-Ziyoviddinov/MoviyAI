import {createHash} from 'node:crypto';
import {catalogNameKey} from './catalog-identity.js';
import {actorCreditMatches} from './catalog-actor-evidence.js';
import {isPublicHttpsUrl} from '../validators/catalog.validator.js';
import type {ActorMatchInput,ActorMatchRecord} from '../types/catalog-match.types.js';
const contains=(text:string,name:string)=>!!name&&` ${catalogNameKey(text)} `.includes(` ${catalogNameKey(name)} `);
export function verifiedActorCredit(input:ActorMatchInput){
 const credit=input.credit;if(!credit||!credit.role.trim()||!credit.filmTitle.trim()||!Number.isInteger(credit.year)||credit.year<1880)return false;
 const names=[input.name,input.originalName??''].filter(Boolean);
 const sources=credit.sources.filter(source=>isPublicHttpsUrl(source.url)&&actorCreditMatches(source,names,[credit.filmTitle],credit.year)&&contains(source.title+' '+(source.snippet??''),credit.role));
 // Two independent site domains must support the same named film role.
 const domains=sources.map(source=>new URL(source.url).hostname.toLowerCase().replace(/^(www|m)\./,''));
 return new Set(domains).size>=2&&sources.some(source=>contains(source.title+' '+(source.snippet??''),String(credit.year)));
}
export function actorProfileKey(input:ActorMatchInput):string|null {
 if(!verifiedActorCredit(input)||!input.profile||!isPublicHttpsUrl(input.profile.url))return null;
 const names=[input.name,input.originalName??''].filter(Boolean);
 if(!names.some(name=>contains(input.profile!.title,name)))return null;
 if(!input.sources.some(source=>source.url===input.profile!.url))return null;
 const url=new URL(input.profile.url);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/.test(key))url.searchParams.delete(key);
 return createHash('sha256').update(url.href.replace(/\/$/,'')).digest('hex');
}
export function actorCreditKey(input:ActorMatchInput):string|null {
 if(!verifiedActorCredit(input))return null;
 const credit=input.credit!;return createHash('sha256').update(JSON.stringify([catalogNameKey(credit.filmTitle),credit.year,catalogNameKey(credit.role)])).digest('hex');
}
export function legacyActorRoleMatches(input:ActorMatchInput,row:ActorMatchRecord){
 if(!verifiedActorCredit(input))return false;
 const key=actorCreditKey(input);if(key&&row.catalogIdentity?.creditKeys?.includes(key))return true;
 return Object.values(row.actorAbout??{}).some(text=>text&&contains(text,input.credit!.filmTitle)&&contains(text,input.credit!.role)&&contains(text,String(input.credit!.year)));
}
