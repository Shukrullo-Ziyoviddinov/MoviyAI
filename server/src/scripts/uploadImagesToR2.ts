import { PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const IMAGES_DIR = path.resolve(process.cwd(), '../clientNative/assets/images');

const MOVIE_FILES = [
  'movie1.jpg',
  'movie2.jpg',
  'movie4.jpg',
  'movie5.jpg',
  'movie8.jpg',
  'movie9.jpg',
  'movie10.jpg',
  'movie14.jpg',
  'movie17.jpg',
  'movie18.jpg',
];

const ACTOR_FILES = [
  'actor1.png',
  'actor2.png',
  'actor3.png',
  'actor4.png',
  'actor5.png',
];

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function required(name: string, value: string) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const bucket = required('R2_BUCKET', env.r2Bucket);
const client = new S3Client({
  region: 'auto',
  endpoint: required('R2_ENDPOINT', env.r2Endpoint),
  credentials: {
    accessKeyId: required('R2_ACCESS_KEY_ID', env.r2AccessKeyId),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY', env.r2SecretAccessKey),
  },
});

async function upload(folder: 'movieimg' | 'actorimg', name: string) {
  const ext = path.extname(name).toLowerCase();
  const body = await readFile(path.join(IMAGES_DIR, name));
  const key = `${folder}/${name}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    })
  );
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: `images/${name}`,
    })
  );
  console.log(`uploaded ${key}`);
}

for (const name of MOVIE_FILES) await upload('movieimg', name);
for (const name of ACTOR_FILES) await upload('actorimg', name);
console.log(`done movies ${MOVIE_FILES.length}, actors ${ACTOR_FILES.length} -> ${bucket}`);
