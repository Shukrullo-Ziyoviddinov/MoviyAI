import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import { randomUUID } from 'node:crypto';
import { putImage, deleteImageKey } from '../../../services/r2.service.js';
import { isPublicHttpsUrl } from '../validators/catalog.validator.js';
import { catalogOperation } from '../utils/catalog-diagnostics.js';

export interface CatalogAsset { key: string; path: string; sourceUrl: string }
export function isPublicImageAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23]/i.test(address) && !/^(?:2001:db8:|2001:0:|2002:)/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 ||
    a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 88 && c === 99) ||
    a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
}
export function createPublicImageLookup(resolve = lookup): LookupFunction { return (hostname, options, callback) => {
  resolve(hostname, { all: true, verbatim: true }).then(addresses => {
    if (!addresses.length || addresses.some(row => !isPublicImageAddress(row.address))) throw new Error('UNSAFE_IMAGE_ADDRESS');
    const choices = options.family ? addresses.filter(row => row.family === options.family) : addresses;
    if (!choices.length) throw new Error('IMAGE_ADDRESS_FAMILY');
    if (options.all) callback(null, choices); else callback(null, choices[0].address, choices[0].family);
  }).catch(error => callback(error, []));
}; }
const publicLookup = createPublicImageLookup();
export function imageFormat(body: Buffer): { mimeType: string; extension: string } | null {
  if (body.length < 12) return null;
  if (body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mimeType: 'image/png', extension: 'png' };
  if (body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP') return { mimeType: 'image/webp', extension: 'webp' };
  return null;
}

/** DNS is validated and pinned on the very socket used for each HTTPS redirect. */
export async function downloadCatalogImage(value: string, signal: AbortSignal, limit = 4 * 1024 * 1024, redirects = 0): Promise<Buffer> {
  if (!isPublicHttpsUrl(value) || redirects > 3) throw new Error('UNSAFE_IMAGE_URL');
  const url = new URL(value);
  if (isIP(url.hostname) && !isPublicImageAddress(url.hostname)) throw new Error('UNSAFE_IMAGE_ADDRESS');
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', agent: false, lookup: publicLookup, signal,
      headers: { Accept: 'image/jpeg,image/png,image/webp', 'Accept-Encoding': 'identity' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        try { downloadCatalogImage(new URL(res.headers.location, url).href, signal, limit, redirects + 1).then(resolve, reject); }
        catch (error) { reject(error); }
        return;
      }
      const type = res.headers['content-type']?.split(';')[0].trim();
      if (res.statusCode !== 200 || !['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'].includes(type ?? '') || Number(res.headers['content-length']) > limit) {
        res.destroy(); reject(Object.assign(new Error('INVALID_IMAGE_RESPONSE'), { status: res.statusCode })); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      res.on('data', (chunk: Buffer) => { size += chunk.length; if (size > limit) { res.destroy(new Error('IMAGE_TOO_LARGE')); return; } chunks.push(chunk); });
      res.on('error', reject); res.on('end', () => { const body = Buffer.concat(chunks); if (!imageFormat(body)) reject(new Error('INVALID_IMAGE_BYTES')); else resolve(body); });
    });
    req.on('error', reject); req.end();
  });
}

export function createCatalogMediaService(deps = { download: downloadCatalogImage, put: putImage, remove: deleteImageKey }) {
  return {
    async store(folder: 'movieimg' | 'actorimg', urls: string[], count: number, track: (key: string) => void, signal: AbortSignal): Promise<CatalogAsset[]> {
      const assets: CatalogAsset[] = [];
      let lastError: unknown;
      for (const url of [...new Set(urls)].slice(0, 7)) {
        if (assets.length >= count) break;
        signal.throwIfAborted();
        try {
          const body = await catalogOperation({provider:'image-source',stage:'image-download'},()=>deps.download(url, AbortSignal.any([signal, AbortSignal.timeout(10000)])));
          const format = imageFormat(body); if (!format || body.length > 4 * 1024 * 1024) continue;
          const fileName = `ai-${randomUUID()}.${format.extension}`;
          const key = `${folder}/${fileName}`; track(key); // Also track an uncertain/timed-out PUT.
          const stored = await catalogOperation({provider:'r2',stage:'image-upload'},()=>deps.put(folder, fileName, body, format.mimeType, signal));
          assets.push({ key, path: stored.path, sourceUrl: url });
        } catch (error) { lastError=error; signal.throwIfAborted(); /* Try another supplied candidate; never invent a URL. */ }
      }
      if (!assets.length) throw lastError ?? new Error('CATALOG_IMAGE_UNAVAILABLE');
      return assets;
    },
    remove: deps.remove,
  };
}
export const catalogMediaService = createCatalogMediaService();
