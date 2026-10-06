import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../db/connect.js';
import * as aboutService from '../services/about.service.js';
import * as actorService from '../services/actor.service.js';
import * as movieService from '../services/movie.service.js';
import * as privacyService from '../services/privacy.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');

async function readJson<T>(fileName: string): Promise<T> {
  const raw = await readFile(path.join(dataDir, fileName), 'utf8');
  return JSON.parse(raw) as T;
}

async function seed() {
  await connectDb();

  const about = await readJson<Record<string, unknown>>('about.json');
  const privacy = await readJson<Record<string, unknown>>('privacy.json');
  const movies = await readJson<Record<string, unknown>[]>('movie.json');
  const actors = await readJson<Record<string, unknown>[]>('actor.json');

  const aboutDoc = await aboutService.upsertAbout(about);
  const privacyDoc = await privacyService.upsertPrivacy(privacy);
  const movieDocs = await movieService.upsertMovies(movies);
  const actorDocs = await actorService.upsertActors(actors);

  console.log('Seeded about:', aboutDoc?.slug, 'v' + aboutDoc?.version);
  console.log('Seeded privacy:', privacyDoc?.slug, 'v' + privacyDoc?.version);
  console.log('Seeded movies:', movieDocs.length);
  console.log('Seeded actors:', actorDocs.length);

  await disconnectDb();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});
