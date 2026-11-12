import {mergeMissing,projectLike} from './catalog-merge-missing.js';
import {catalogMoviePayloadSchema} from '../validators/catalog.validator.js';
import type {CatalogMoviePayload} from '../types/catalog.types.js';
export function prepareMovieUpdate(current:unknown,incoming:CatalogMoviePayload){
 const combined=mergeMissing(projectLike(incoming,current),incoming) as CatalogMoviePayload;
 const merged=catalogMoviePayloadSchema.parse({...combined,like:'0',dislike:'0'});
 const {like,dislike,...updates}=merged;
 // Reactions are live counters, not fields owned by AI enrichment.
 return {merged,updates};
}
