import { AI_CONFIG } from '../config/ai.config.js';
import { searchImages } from './serper.service.js';
import { publicHttpsUrl } from './image-movie.service.js';
import type {MovieSearchResult} from '../types/movie-search.types.js';

export type CharacterImage = { label: string; imageUrl: string; sourceUrl: string | null; kind?: 'character'|'actor' };
export function mainCharacterLabels(answer: string) {
  const labels: string[] = []; let inside = false;
  for (const line of answer.split('\n')) {
    const trimmed = line.trim();
    if (/^(?:#{1,6}\s+|\*\*|__)/.test(trimmed) && /^(?:#{1,6}\s*)?(?:\*\*|__)?(?:asosiy qahramonlar|main characters|главные герои|основные персонажи)/i.test(trimmed)) { inside = true; continue; }
    if (inside && /^(?:#{1,6}\s+|\*\*[^*]+\*\*\s*$|__[^_]+__\s*$)/.test(trimmed)) inside = false;
    const match = inside && /^(?:[-*+]\s+|\d+[.)]\s+)(?:\*\*|__)([^*_]+)(?:\*\*|__)/.exec(trimmed);
    if (match) {
      const label = match[1].replace(/[:：]\s*$/, '').trim();
      if (label && label.length <= 100 && !labels.includes(label)) labels.push(label);
    }
  }
  return labels.slice(0, 6);
}
function normalized(value: string) { return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLowerCase(); }
export function createCharacterImageSearch(deps = { searchImages }) {
  return async function findCharacterImages(answer: string, movie?:MovieSearchResult): Promise<CharacterImage[]> {
    if (movie?.catalogId) return movie.catalogPortraits ?? [];
    if(movie?.details && movie.year && AI_CONFIG.serperApiKey){
      const requests=[
        ...(movie.details.characters??[]).slice(0,5).map(item=>({label:`${item.name} (${item.originalName})`,name:item.originalName,kind:'character' as const})),
        ...movie.details.cast.slice(0,5).map(item=>({label:item.name,name:item.originalName??item.name,kind:'actor' as const})),
      ];
      return (await Promise.all(requests.map(async item=>{
        try{
          const result=await deps.searchImages(item.kind==='actor'?`"${item.name}" ${movie.title} actor portrait headshot`:`${movie.title} ${movie.year} ${item.name} character portrait -actor -cosplay -merchandise`,{num:5});
          const name=normalized(item.name).replace(/^the\s+/,'').trim();
          const image=result.images?.find(image=>{
            const title=normalized(image.title??'');const years:string[]=title.match(/\b(?:19|20)\d{2}\b/g)??[];
            return title.includes(name)&&(item.kind==='actor'||!years.length||years.includes(String(movie.year)))&&!!publicHttpsUrl(image.imageUrl);
          });
          return image?{label:item.label,kind:item.kind,imageUrl:publicHttpsUrl(image.thumbnailUrl??'')??publicHttpsUrl(image.imageUrl)!,sourceUrl:image.link?publicHttpsUrl(image.link):null}:null;
        }catch{return null;}
      }))).filter((item):item is NonNullable<typeof item>=>item!==null);
    }
    const labels = mainCharacterLabels(answer);
    if (!labels.length || !AI_CONFIG.serperApiKey) return [];
    // Use explicit film/year and original character names from the answer. No
    // second model call and no guesses based on a previous or unrelated film.
    const films = [...answer.matchAll(/^#{1,2}\s+([^\n]+?)\s*\(((?:19|20)\d{2})\)/gm)];
    if (films.length !== 1 || films[0][1].length > 150) return [];
    const plan = {filmTitle: films[0][1].replace(/\*\*/g,''),version:films[0][2]};
    const planned = labels.flatMap(label => {
      const alias = /^(.+?)\s*\(([^)]+)\)$/.exec(label);
      const searchName = alias?.[2].normalize('NFD').replace(/\p{M}/gu, '');
      return searchName && /^[a-zA-Z][a-zA-Z .'-]{0,80}$/.test(searchName) ? [{label,searchName}] : [];
    });
    try {
      return (await Promise.all(planned.map(async character => {
        try {
          const result = await deps.searchImages(`${plan.filmTitle} ${plan.version} ${character.searchName} character portrait -actor -cosplay -merchandise`, { num: 5 });
          const name = normalized(character.searchName).replace(/\([^)]*\)/g, '').replace(/^the\s+/, '').trim();
          const year = /\b(?:19|20)\d{2}\b/.exec(plan.version)?.[0];
          const image = result.images?.find(item => {
            const title = normalized(item.title ?? '');
            const years: string[] = title.match(/\b(?:19|20)\d{2}\b/g) ?? [];
            return !!name && title.includes(name) && (!year || !years.length || years.includes(year)) && !!publicHttpsUrl(item.imageUrl);
          });
          return image ? { label: character.label, imageUrl: publicHttpsUrl(image.thumbnailUrl ?? '') ?? publicHttpsUrl(image.imageUrl)!, sourceUrl: image.link ? publicHttpsUrl(image.link) : null } : null;
        } catch { return null; }
      }))).filter((item): item is CharacterImage => item !== null);
    } catch { return []; } // Never discard a chat answer if optional portraits fail.
  };
}
export const findCharacterImages = createCharacterImageSearch();
