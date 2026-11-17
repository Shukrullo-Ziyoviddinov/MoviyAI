const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();

/** A title appearing in search results is not evidence that it matches the clip. */
export function supportedTrialMatch(result,observations,sources){
 if(!result.matched||!result.title?.trim()||result.contradictions?.length)return null;
 const links=(result.evidence??[]).filter(item=>{
  const moment=observations.moments[item.momentIndex],source=sources[item.sourceIndex];
  if(!moment||!source||!item.distinctive||!item.explanation?.trim())return false;
  const quote=normalize(item.quote??'');
  return quote.length>=25&&normalize(source.snippet).includes(quote);
 });
 if(!links.length)return null;
 return {title:result.title,year:result.year,evidence:links};
}
