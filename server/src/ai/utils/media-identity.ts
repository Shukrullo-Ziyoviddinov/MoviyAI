export interface MediaIdentityEvidence {
  kind: 'scene' | 'dialogue' | 'setting' | 'title' | 'actor';
  observation: string;
  sourceIndex: number;
  sourceQuote: string;
}
const normalize=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').trim();

/** Search results prove a work exists; independent visual evidence must identify it. */
export function hasMediaIdentityEvidence(
  match:{confidence:string;sourceIndexes:number[];visualEvidence?:MediaIdentityEvidence[];contradictions?:string[]},
  sources:Array<{title:string;snippet?:string}>,video:boolean,
):boolean {
  if(match.confidence!=='high'||match.contradictions?.some(item=>item.trim()))return false;
  const observations=new Set<string>();
  const evidence=(match.visualEvidence??[]).filter(item=>{
    const source=sources[item.sourceIndex],observation=normalize(item.observation),quote=normalize(item.sourceQuote);
    if(!source||!match.sourceIndexes.includes(item.sourceIndex)||observation.length<12||quote.length<12||
      !normalize(source.title+' '+(source.snippet??'')).includes(quote)||observations.has(observation))return false;
    observations.add(observation);return true;
  });
  return evidence.length>=(video?2:1)&&evidence.some(item=>item.kind!=='actor');
}
