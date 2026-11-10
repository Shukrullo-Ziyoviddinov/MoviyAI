import { readFile } from 'node:fs/promises';
import { mongo } from 'mongoose';
import { env } from '../config/env.js';
import { GENRE_ALIASES } from '../ai/catalog/config/catalog-reference.config.js';
import { catalogNameKey } from '../ai/catalog/utils/catalog-identity.js';

// Explicit maintenance command. Chat never creates dictionary rows.
// Default is preview; --apply only adds missing genres/fills empty translations.
const rows = JSON.parse((await readFile(new URL('../../data/genre.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, '')) as Array<{name:string;nameRu:string}>;
const client = new mongo.MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
const apply = process.argv.includes('--apply');
const groups = (value:string) => Object.entries(GENRE_ALIASES).filter(([,aliases]) => aliases.some(alias=>catalogNameKey(alias)===catalogNameKey(value))).map(([key])=>key);
try {
  await client.connect();
  const collection = client.db().collection('genres');
  const existing = await collection.find().toArray();
  const additions: typeof rows = [];
  const translations: Array<{id:typeof existing[number]['_id'];nameRu:string}> = [];
  for (const row of rows) {
    if (!row.name.trim() || !row.nameRu.trim()) throw new Error('Invalid dictionary label');
    const concepts = [...groups(row.name), ...groups(row.nameRu)];
    const matches = existing.filter(item=>[item.name,item.nameRu].some(name=>typeof name==='string' &&
      ([row.name,row.nameRu].some(label=>catalogNameKey(label)===catalogNameKey(name)) || groups(name).some(group=>concepts.includes(group)))));
    if (matches.length>1) throw new Error(`Ambiguous existing genre: ${row.name}`);
    if (!matches.length) additions.push(row);
    else if (!matches[0].nameRu?.trim()) translations.push({id:matches[0]._id,nameRu:row.nameRu});
  }
  if (apply) {
    for (const row of additions) await collection.updateOne({name:row.name},{$setOnInsert:{...row,createdAt:new Date(),updatedAt:new Date()}},{upsert:true});
    for (const row of translations) await collection.updateOne({_id:row.id,$or:[{nameRu:''},{nameRu:null},{nameRu:{$exists:false}}]},{$set:{nameRu:row.nameRu,updatedAt:new Date()}});
  }
  console.log(JSON.stringify({applied:apply,added:additions.map(row=>row.name),filledTranslations:translations.length,total:await collection.countDocuments()},null,2));
} finally { await client.close(); }
