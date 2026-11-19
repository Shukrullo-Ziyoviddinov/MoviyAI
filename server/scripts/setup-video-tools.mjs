import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(new URL('./video-tools.lock.json', import.meta.url), 'utf8'));
const asset = lock.assets[`${process.platform}-${process.arch}`];
if (!asset) throw Error('Unsupported platform: configure VIDEO_YTDLP_PATH manually.');
const target = join(root, '.tools', 'video-import', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
let existing = false;
try { existing = (await stat(target)).isFile() && await digest(target) === asset.sha256; } catch { /* Not installed. */ }
if (existing) console.log(JSON.stringify({ tool: 'yt-dlp', version: lock.version, status: 'already-verified' }));
else {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.partial-${process.pid}`;
  try {
    const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${lock.version}/${asset.name}`, { signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw Error('Official tool download failed.');
    const hash = createHash('sha256'); let bytes = 0;
    const verify = new Transform({ transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > asset.bytes) { callback(Error('Tool size mismatch.')); return; }
      hash.update(chunk); callback(null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(temporary, { flags: 'wx' }));
    if (bytes !== asset.bytes || hash.digest('hex') !== asset.sha256) throw Error('Official tool SHA-256 mismatch.');
    await chmod(temporary, 0o755);
    // Both paths are fixed files inside this project's dedicated tool directory.
    await rename(temporary, target);
    console.log(JSON.stringify({ tool: 'yt-dlp', version: lock.version, status: 'installed-verified', bytes }));
  } finally { await rm(temporary, { force: true }); }
}
