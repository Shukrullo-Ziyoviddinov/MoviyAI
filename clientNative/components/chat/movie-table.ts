import type { MovieSearchResult, MovieTableFact } from '@/src/types/chat';

export function movieTableRows(movie: MovieSearchResult, minute: string) {
  const rows: Array<{key:string;value:string;source?:string}> = [];
  const add = (key:string,value:string|number|null|undefined,source?:string) => {
    if(value!==null && value!==undefined && String(value).trim()) rows.push({key,value:String(value),source});
  };
  const source=movie.sources.find(item=>item.url.startsWith('https://'))?.url;
  if(source){add('original',movie.title,source);add('uz',movie.titleUz,source);add('ru',movie.titleRu,source);add('year',movie.year,source);}
  function field(key:string,fact?:MovieTableFact,suffix=''){
    if(!fact || fact.value===null || fact.value===undefined || !fact.sources?.length)return;
    const link=fact.sources.find(item=>item.url.startsWith('https://'))?.url;
    if(!link)return;
    const value=Array.isArray(fact.value)?fact.value.filter(Boolean).join(', '):String(fact.value);
    if(value.trim())add(key,value+suffix,link);
  }
  const d=movie.details;
  field('productionYears',d?.productionYears);field('countries',d?.countries);field('genres',d?.genres);
  field('directors',d?.directors);field('writers',d?.writers);field('runtime',d?.runtimeMinutes,' '+minute);
  field('premiere',d?.premiere);field('imdb',d?.imdb,' / 10');field('kinopoisk',d?.kinopoisk,' / 10');
  field('budget',d?.budget);field('boxOffice',d?.boxOffice);field('ageRating',d?.ageRating);
  return rows;
}
