import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { putImage } from '../services/r2.service.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: tsx src/scripts/uploadBanners.ts <image> [image...]');
  process.exit(1);
}

for (const [index, filePath] of files.entries()) {
  const body = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const name = `banner${index + 1}${ext === '.jpeg' ? '.jpg' : ext || '.png'}`;
  const saved = await putImage('banner', name, body, contentType);
  console.log(`uploaded ${saved.key} -> ${saved.path}`);
}
