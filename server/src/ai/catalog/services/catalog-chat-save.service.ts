import { prepareCatalogDraft } from '../mappers/movie.mapper.js';
import { catalogMatcher, movieMatchInput } from './catalog-match.service.js';
import { catalogReferenceRepository } from '../repositories/catalog-reference.repository.js';
import { resolveCatalogReferences } from './catalog-reference.service.js';
import { enrichCatalogDraft } from './catalog-enrichment.service.js';
import { researchCatalogLinks } from './catalog-link-research.service.js';
import { saveCatalogMovie } from './catalog-save.service.js';
import { researchCatalogFranchise } from './catalog-franchise-research.service.js';
import type { CatalogJobProcessor } from '../types/catalog-job.types.js';
import { catalogOperation,catalogFailureDetails,type CatalogStage } from '../utils/catalog-diagnostics.js';
import { ensureCatalogDictionary } from './catalog-dictionary.service.js';

const defaults={ matcher: catalogMatcher, references: () => catalogReferenceRepository.load(), enrich: enrichCatalogDraft, links: researchCatalogLinks, save: saveCatalogMovie, franchise: researchCatalogFranchise, ensureReferences:ensureCatalogDictionary };
export function createCatalogChatProcessor(deps:Omit<typeof defaults,'ensureReferences'|'franchise'>&Partial<Pick<typeof defaults,'ensureReferences'|'franchise'>> = defaults) {
  const process: CatalogJobProcessor = async (input, checkpointed, signal, checkpoint) => {
    let draft = checkpointed ? structuredClone(checkpointed) : prepareCatalogDraft(input.movie, { language: input.language });
    let checkpointError:unknown;
    let checkpointFailed=false;
    const persist=async(next:typeof draft)=>{draft=structuredClone(next);try{await checkpoint(next);}catch(error){checkpointFailed=true;checkpointError=error;throw error;}};
    async function optional<T>(stage:CatalogStage,work:()=>Promise<T>,fallback:()=>T):Promise<T>{
      try{return await work();}catch(error){signal.throwIfAborted();if(checkpointFailed)throw checkpointError;console.warn('[AI_CATALOG]',{event:'optional-data-unavailable',operation:stage,...catalogFailureDetails(error)});return fallback();}
    }
    async function references(){
      let snapshot=await catalogOperation({provider:'mongodb',stage:'reference-load'},()=>deps.references());
      if(resolveCatalogReferences(draft,snapshot).issues.some(issue=>issue.kind==='missing')&&deps.ensureReferences)
        snapshot=await optional('dictionary-verify',()=>deps.ensureReferences!(draft,signal),()=>snapshot);
      return resolveCatalogReferences(draft,snapshot,{allowMissing:true});
    }
    signal.throwIfAborted();
    const match = await catalogOperation({provider:'mongodb',stage:'duplicate-check'},()=>deps.matcher.movie(movieMatchInput(draft)));
    if (match.status === 'existing') return { status: 'existing', movieId: match.id };
    if (match.status === 'conflict' || match.status === 'needs-research' && draft.identity.year !== null)
      return { status: 'needs-enrichment', issues: [{ path: 'identity', action: 'research', blocking: true, message: match.reason }] };
    draft=(await references()).draft;
    draft = await optional('enrichment',()=>catalogOperation({provider:'internal',stage:'enrichment'},()=>deps.enrich(draft, input, signal, persist)),()=>draft);
    signal.throwIfAborted();
    draft=(await references()).draft;
    if (deps.franchise) { draft = await optional('franchise',()=>catalogOperation({provider:'internal',stage:'franchise'},()=>deps.franchise!(draft, signal)),()=>draft); await persist(draft); }
    draft = await optional('links',()=>catalogOperation({provider:'internal',stage:'links'},()=>deps.links(draft, signal)),()=>draft);
    await persist(draft); signal.throwIfAborted();
    return catalogOperation({provider:'internal',stage:'save'},()=>deps.save(draft));
  };
  return process;
}
export const processCatalogChatSave = createCatalogChatProcessor();
