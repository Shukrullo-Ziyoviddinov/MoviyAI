import { catalogNameKey, identityIds } from './catalog-identity.js';
import type { MovieSource } from '../../types/movie-dossier.types.js';

const contains = (text:string,name:string) => !!name && ` ${text} `.includes(` ${name} `);
/** Only punctuation and explicit part numerals are equivalent, never different sequels. */
function filmKey(value:string) {
  return catalogNameKey(value.replace(/&/g,' and ')).replace(/\b(part|chapter) (ii|iii|iv|v|vi|vii|viii)\b/g,(_all,part:string,roman:string)=>`${part} ${{ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8}[roman]}`);
}
export function actorProfileMatches(source:MovieSource,names:string[]) {
  const ids=identityIds([source],'actor');
  // A snippet mentioning Emma Watson must not validate Emily Watson's profile.
  return !!(ids.imdbId||ids.kinopoiskId) && names.some(name=>contains(catalogNameKey(source.title),catalogNameKey(name)));
}
export function actorCreditMatches(source:MovieSource,names:string[],titles:string[],year:number|null) {
  const text=filmKey(source.title+' '+(source.snippet??''));
  const titleYears:string[]=source.title.match(/\((?:19|20)\d{2}\)/g)??[];
  if(year && titleYears.length && !titleYears.includes(`(${year})`))return false;
  return names.some(name=>contains(text,filmKey(name))) && titles.some(title=>contains(text,filmKey(title)));
}
export function actorIdentitySources(sources:MovieSource[],profile:MovieSource) {
  const selected=identityIds([profile],'actor');
  return sources.filter(source=>{
    const ids=identityIds([source],'actor');
    // Only the chosen person's official IDs may enter this identity namespace.
    return (!ids.imdbId||ids.imdbId===selected.imdbId)&&(!ids.kinopoiskId||ids.kinopoiskId===selected.kinopoiskId);
  });
}
