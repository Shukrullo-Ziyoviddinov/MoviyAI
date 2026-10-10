import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;
export const IMAGE_FOLDERS = ['movieimg', 'actorimg', 'banner'] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

function requireR2(name: string, value: string) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

let client: S3Client | null = null;

function r2() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: requireR2('R2_ENDPOINT', env.r2Endpoint),
      credentials: {
        accessKeyId: requireR2('R2_ACCESS_KEY_ID', env.r2AccessKeyId),
        secretAccessKey: requireR2('R2_SECRET_ACCESS_KEY', env.r2SecretAccessKey),
      },
    });
  }
  return client;
}

export function isImageFolder(value: string): value is ImageFolder {
  return (IMAGE_FOLDERS as readonly string[]).includes(value);
}

export function imageObjectKey(folder: string, fileName: string) {
  if (!isImageFolder(folder)) return null;
  const file = fileName.split(/[/\\]/).pop() ?? '';
  if (!file || !SAFE_NAME.test(file)) return null;
  return `${folder}/${file}`;
}

export async function putImage(
  folder: string,
  fileName: string,
  body: Buffer,
  contentType: string
) {
  const key = imageObjectKey(folder, fileName);
  if (!key || !isImageFolder(folder)) throw new Error('INVALID_FILENAME');
  await r2().send(
    new PutObjectCommand({
      Bucket: requireR2('R2_BUCKET', env.r2Bucket),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const name = key.slice(folder.length + 1);
  return { key, folder, fileName: name, path: `/img/${name}` };
}

export async function getImage(folder: string, fileName: string) {
  const key = imageObjectKey(folder, fileName);
  if (!key) return null;
  try {
    const obj = await r2().send(
      new GetObjectCommand({
        Bucket: requireR2('R2_BUCKET', env.r2Bucket),
        Key: key,
      })
    );
    if (!obj.Body) return null;
    const bytes = await obj.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: obj.ContentType || 'application/octet-stream',
    };
  } catch (err) {
    const named = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (
      named.$metadata?.httpStatusCode === 404 ||
      named.name === 'NoSuchKey' ||
      named.name === 'NotFound'
    ) {
      return null;
    }
    throw err;
  }
}

export async function deleteImageKey(key: string) {
  await r2().send(
    new DeleteObjectCommand({
      Bucket: requireR2('R2_BUCKET', env.r2Bucket),
      Key: key,
    })
  );
}
