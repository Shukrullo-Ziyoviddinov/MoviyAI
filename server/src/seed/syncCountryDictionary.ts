import { readFile } from 'node:fs/promises';
import { mongo } from 'mongoose';
import { env } from '../config/env.js';
import { COUNTRY_ALIASES } from '../ai/catalog/config/catalog-reference.config.js';
import { catalogNameKey } from '../ai/catalog/utils/catalog-identity.js';

// Explicit dictionary maintenance; chat never adds countries automatically.
const rows = JSON.parse((await readFile(new URL('../../data/country.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, '')) as Array<{name:string}>;
const client = new mongo.MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
const apply = process.argv.includes('--apply');
const aliasIndex = new Map<string, Set<string>>();
for(const [concept,aliases] of Object.entries(COUNTRY_ALIASES)) for(const alias of aliases) {
  const key=catalogNameKey(alias), values=aliasIndex.get(key)??new Set<string>();
  values.add(concept);aliasIndex.set(key,values);
}
const groups = (value:string) => [...(aliasIndex.get(catalogNameKey(value))??[])];
try {
  await client.connect(); const collection = client.db().collection('countries');
  const existing = await collection.find().toArray();
  const additions: typeof rows = [];
  for (const row of rows) {
    if (!row.name.trim()) throw new Error('Invalid country name');
    const concepts = groups(row.name);
    const matches = existing.filter(item=>typeof item.name==='string' &&
      (catalogNameKey(item.name)===catalogNameKey(row.name) || groups(item.name).some(group=>concepts.includes(group))));
    if(matches.length>1) throw new Error(`Ambiguous existing country: ${row.name}`);
    if(!matches.length) additions.push(row);
  }
  if(apply && additions.length) await collection.bulkWrite(additions.map(row=>({updateOne:{filter:{name:row.name},update:{$setOnInsert:{name:row.name,createdAt:new Date(),updatedAt:new Date()}},upsert:true}})));
  console.log(JSON.stringify({applied:apply,added:additions.length,total:await collection.countDocuments(),unitedKingdomAvailable:!!await collection.findOne({name:{$in:COUNTRY_ALIASES.uk}})},null,2));
} finally {await client.close();}
