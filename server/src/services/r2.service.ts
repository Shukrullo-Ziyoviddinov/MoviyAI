import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;
export const IMAGE_FOLDERS = ['movieimg', 'actorimg', 'banner', 'adminimg'] as const;
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

// Chat objects are intentionally excluded from the public IMAGE_FOLDERS routes.
export function chatImageKey(conversationId: string, requestId: string, index: number, hash: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(conversationId) || !/^[a-zA-Z0-9-]+$/.test(requestId) ||
      !Number.isInteger(index) || index < 0 || index > 2 || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('INVALID_CHAT_IMAGE_KEY');
  return `chatimg/${conversationId}/${requestId}/${index}-${hash}`;
}
function validateChatKey(key: string) {
  if (!/^chatimg\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\/[0-2]-[a-f0-9]{64}$/.test(key)) throw new Error('INVALID_CHAT_IMAGE_KEY');
}
export async function putChatImage(key: string, body: Buffer, contentType: string) {
  validateChatKey(key);
  await r2().send(new PutObjectCommand({ Bucket: requireR2('R2_BUCKET', env.r2Bucket), Key: key,
    Body: body, ContentType: contentType, CacheControl: 'private, no-store' }), { abortSignal: AbortSignal.timeout(20000) });
}
export async function getChatImage(key: string) {
  validateChatKey(key);
  try {
    const object = await r2().send(new GetObjectCommand({ Bucket: requireR2('R2_BUCKET', env.r2Bucket), Key: key }), { abortSignal: AbortSignal.timeout(20000) });
    return object.Body ? Buffer.from(await object.Body.transformToByteArray()) : null;
  } catch (error) {
    const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey' || e.name === 'NotFound') return null;
    throw error;
  }
}
export async function deleteChatImage(key: string) {
  validateChatKey(key);
  await r2().send(new DeleteObjectCommand({ Bucket: requireR2('R2_BUCKET', env.r2Bucket), Key: key }), { abortSignal: AbortSignal.timeout(20000) });
}
export async function signChatImage(key: string, method: 'GET' | 'PUT', mimeType?: string, size?: number, expiresIn?: number) {
  validateChatKey(key);
  const input = { Bucket: requireR2('R2_BUCKET', env.r2Bucket), Key: key };
  const command = method === 'PUT'
    ? new PutObjectCommand({ ...input, ContentType: mimeType, ContentLength: size, CacheControl: 'private, no-store' })
    : new GetObjectCommand(input);
  return getSignedUrl(r2(), command, { expiresIn: expiresIn ?? (method === 'PUT' ? 300 : 3600) });
}
export async function inspectChatImage(key: string) {
  validateChatKey(key);
  const input = { Bucket: requireR2('R2_BUCKET', env.r2Bucket), Key: key };
  const meta = await r2().send(new HeadObjectCommand(input), { abortSignal: AbortSignal.timeout(10000) });
  if (!meta.ContentLength || meta.ContentLength > 4 * 1024 * 1024) throw new Error('INVALID_CHAT_IMAGE_SIZE');
  // Inspect only the signature bytes; the image body never passes through Render.
  const sample = await r2().send(new GetObjectCommand({ ...input, Range: 'bytes=0-11' }), { abortSignal: AbortSignal.timeout(10000) });
  if (!sample.Body || sample.ContentLength === undefined || sample.ContentLength > 12 || !sample.ContentRange?.startsWith('bytes 0-')) {
    (sample.Body as { destroy?: () => void } | undefined)?.destroy?.();
    throw new Error('INVALID_CHAT_IMAGE_RANGE');
  }
  return { size: meta.ContentLength, mimeType: meta.ContentType, bytes: Buffer.from(await sample.Body!.transformToByteArray()) };
}
