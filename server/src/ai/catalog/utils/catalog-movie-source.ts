import {createHash} from 'node:crypto';
import {catalogNameKeys,catalogNameKey} from './catalog-identity.js';
import {isPublicHttpsUrl} from '../validators/catalog.validator.js';
import type {MovieMatchInput} from '../types/catalog-match.types.js';
/** A dedicated named film page provides identity when the release year is unknown. */
export function movieSourceKeys(input:MovieMatchInput){
 const names=catalogNameKeys([input.originalTitle,...input.aliases]);
 return [...new Set(input.sources.flatMap(source=>{
  if(!isPublicHttpsUrl(source.url)||!names.some(name=>` ${catalogNameKey(source.title)} `.includes(` ${name} `)))return [];
  const url=new URL(source.url);if(url.pathname==='/'||/\/(search|tag|category|list)(\/|$)/i.test(url.pathname))return [];
  url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/.test(key))url.searchParams.delete(key);
  return [createHash('sha256').update(url.href.replace(/\/$/,'')).digest('hex')];
 }))];
}
