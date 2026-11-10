import type { CatalogReferenceSnapshot } from './catalog-reference.types.js';
import type { MovieSource } from '../../types/movie-dossier.types.js';
import type { CATALOG_CATEGORIES } from '../config/catalog-reference.config.js';
export interface DictionaryAddition {
  kind:'genre'|'country'; input:string; name:string; nameRu?:string;
  aliases:string[]; category?:typeof CATALOG_CATEGORIES[number]; sources:MovieSource[];
}
export interface CatalogDictionaryRepository {
  load():Promise<CatalogReferenceSnapshot>;
  apply(additions:DictionaryAddition[]):Promise<void>;
}
