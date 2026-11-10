import { prepareCatalogDraft } from '../mappers/movie.mapper.js';
import { catalogMatcher, movieMatchInput } from './catalog-match.service.js';
import { catalogReferenceRepository } from '../repositories/catalog-reference.repository.js';
import { resolveCatalogReferences } from './catalog-reference.service.js';
import { enrichCatalogDraft } from './catalog-enrichment.service.js';
import { researchCatalogLinks } from './catalog-link-research.service.js';
import { saveCatalogMovie } from './catalog-save.service.js';
import { researchCatalogFranchise } from './catalog-franchise-research.service.js';
import type { CatalogJobProcessor } from '../types/catalog-job.types.js';
import { catalogOperation } from '../utils/catalog-diagnostics.js';
import { ensureCatalogDictionary } from './catalog-dictionary.service.js';

const defaults={ matcher: catalogMatcher, references: () => catalogReferenceRepository.load(), enrich: enrichCatalogDraft, links: researchCatalogLinks, save: saveCatalogMovie, franchise: researchCatalogFranchise, ensureReferences:ensureCatalogDictionary };
export function createCatalogChatProcessor(deps:Omit<typeof defaults,'ensureReferences'|'franchise'>&Partial<Pick<typeof defaults,'ensureReferences'|'franchise'>> = defaults) {
  const process: CatalogJobProcessor = async (input, checkpointed, signal, checkpoint) => {
    let draft = checkpointed ? structuredClone(checkpointed) : prepareCatalogDraft(input.movie, { language: input.language });
    signal.throwIfAborted();
    const match = await catalogOperation({provider:'mongodb',stage:'duplicate-check'},()=>deps.matcher.movie(movieMatchInput(draft)));
    if (match.status === 'existing') return { status: 'existing', movieId: match.id };
    if (match.status === 'conflict' || match.status === 'needs-research' && draft.identity.year !== null)
      return { status: 'needs-enrichment', issues: [{ path: 'identity', action: 'research', blocking: true, message: match.reason }] };
    let references = resolveCatalogReferences(draft, await catalogOperation({provider:'mongodb',stage:'reference-load'},()=>deps.references()));
    if(references.issues.some(issue=>issue.kind==='missing')&&deps.ensureReferences)
      references=resolveCatalogReferences(draft,await deps.ensureReferences(draft,signal));
    if (!references.ready && references.issues.some(issue => issue.kind !== 'unverified')) {
      await checkpoint(draft); return { status: 'needs-enrichment', issues: references.issues };
    }
    draft = await catalogOperation({provider:'internal',stage:'enrichment'},()=>deps.enrich(draft, input, signal, checkpoint));
    signal.throwIfAborted();
    references = resolveCatalogReferences(draft, await catalogOperation({provider:'mongodb',stage:'reference-load'},()=>deps.references()));
    if(references.issues.some(issue=>issue.kind==='missing')&&deps.ensureReferences){
      references=resolveCatalogReferences(draft,await deps.ensureReferences(draft,signal));
      // Newly researched facts can introduce a missing dictionary entry after
      // enrichment's reference guard. Resume that checkpoint once it is resolved.
      if(references.ready){
        draft=await catalogOperation({provider:'internal',stage:'enrichment'},()=>deps.enrich(references.draft,input,signal,checkpoint));
        references=resolveCatalogReferences(draft,await deps.references());
      }
    }
    if (!references.ready) { await checkpoint(draft); return { status: 'needs-enrichment', issues: references.issues }; }
    if (deps.franchise) { draft = await catalogOperation({provider:'internal',stage:'franchise'},()=>deps.franchise!(references.draft, signal)); await checkpoint(draft); }
    else draft = references.draft;
    draft = await catalogOperation({provider:'internal',stage:'links'},()=>deps.links(draft, signal));
    await checkpoint(draft); signal.throwIfAborted();
    return catalogOperation({provider:'internal',stage:'save'},()=>deps.save(draft));
  };
  return process;
}
export const processCatalogChatSave = createCatalogChatProcessor();
