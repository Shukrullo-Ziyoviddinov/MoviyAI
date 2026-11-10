import { Genre } from '../../../models/Genre.js';
import { Country } from '../../../models/Country.js';
import { withCatalogTransaction } from '../../../services/catalog-transaction.service.js';
import { createCatalogReferenceRepository, catalogReferenceRepository } from './catalog-reference.repository.js';
import { findReferenceRows } from '../services/catalog-reference.service.js';
import { GENRE_ALIASES, COUNTRY_ALIASES } from '../config/catalog-reference.config.js';
import { catalogNameKeys } from '../utils/catalog-identity.js';
import type { CatalogDictionaryRepository } from '../types/catalog-dictionary.types.js';

let indexes:Promise<unknown>|undefined;
export const catalogDictionaryRepository:CatalogDictionaryRepository = {
  load:()=>catalogReferenceRepository.load(),
  async apply(additions) {
    if(!additions.length)return;
    indexes??=Promise.all([Genre.createIndexes(),Country.createIndexes()]).catch(error=>{indexes=undefined;throw error;});
    await indexes;
    await withCatalogTransaction(async session=>{
      // Same durable gate as movie saves: concurrent workers recheck fresh rows.
      for(const addition of additions){
        const snapshot=await createCatalogReferenceRepository(session).load();
        const labels=[addition.input,addition.name,addition.nameRu,...addition.aliases].filter((value):value is string=>!!value);
        if(addition.kind==='genre'){
          const matches=new Map(labels.flatMap(value=>findReferenceRows(value,snapshot.genres,row=>[row.name,row.nameRu,...(row.catalogAliases??[])],GENRE_ALIASES)).map(row=>[row.name,row]));
          if(matches.size>1)throw new Error('DICTIONARY_GENRE_CONFLICT');
          const existing=[...matches.values()][0];
          if(existing){
            if(!existing.nameRu.trim())throw new Error('DICTIONARY_GENRE_TRANSLATION_REQUIRED');
            await Genre.updateOne({name:existing.name},{$addToSet:{catalogAliases:{$each:labels},catalogKeys:{$each:catalogNameKeys([existing.name,existing.nameRu,...labels])}}},{session});
          }else await Genre.create([{name:addition.name,nameRu:addition.nameRu,catalogAliases:labels,catalogKeys:catalogNameKeys(labels),catalogCategory:addition.category,catalogEvidence:{sources:addition.sources,addedAt:new Date()}}],{session});
        }else{
          const matches=new Map(labels.flatMap(value=>findReferenceRows(value,snapshot.countries,row=>[row.name,...(row.catalogAliases??[])],COUNTRY_ALIASES)).map(row=>[row.name,row]));
          if(matches.size>1)throw new Error('DICTIONARY_COUNTRY_CONFLICT');
          const existing=[...matches.values()][0];
          if(existing)await Country.updateOne({name:existing.name},{$addToSet:{catalogAliases:{$each:labels},catalogKeys:{$each:catalogNameKeys([existing.name,...labels])}}},{session});
          else await Country.create([{name:addition.name,catalogAliases:labels,catalogKeys:catalogNameKeys(labels),catalogEvidence:{sources:addition.sources,reference:'bundled-country-reference',addedAt:new Date()}}],{session});
        }
      }
    });
  },
};
