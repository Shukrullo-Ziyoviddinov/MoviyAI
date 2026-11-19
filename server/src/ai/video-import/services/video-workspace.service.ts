import { join, dirname, basename, isAbsolute } from 'node:path';
import { mkdir, mkdtemp, readdir, lstat, rm, writeFile, readFile, utimes, realpath } from 'node:fs/promises';
import { VIDEO_IMPORT_SERVER_ROOT, VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';
import { VideoProbeError } from '../types/video-probe.types.js';

const ROOT = join(VIDEO_IMPORT_SERVER_ROOT, '.video-import-tmp');
const active = new Set<string>();
async function removeWorkspace(directory: string) {
  if (!isAbsolute(directory) || dirname(directory) !== ROOT) throw new VideoProbeError('INVALID_ARTIFACT');
  const info = await lstat(directory).catch(error => { if(error.code === 'ENOENT') return null; throw error; });
  if (!info) return;
  const root = await realpath(ROOT), server = await realpath(VIDEO_IMPORT_SERVER_ROOT);
  if (!info.isDirectory() || info.isSymbolicLink() || dirname(root) !== server || basename(root) !== '.video-import-tmp'
    || dirname(await realpath(directory)) !== root) throw new VideoProbeError('INVALID_ARTIFACT');
  await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
/** Only dead/stale, immediate mkdtemp children of our own root are eligible. */
export async function cleanupAbandonedVideoWorkspaces(now = new Date()) {
  const entries = await readdir(ROOT, { withFileTypes: true }).catch(error => { if(error.code === 'ENOENT') return []; throw error; });
  let removed = 0;
  for (const entry of entries) {
    const directory = join(ROOT, entry.name);
    if (!/^job-[A-Za-z0-9]+$/.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink() || active.has(directory)) continue;
    const marker = join(directory, '.owner.json');
    const info = await lstat(marker).catch(error => { if(error.code === 'ENOENT') return lstat(directory); throw error; });
    if (info.isSymbolicLink() || info.isFile() && info.size > 1024 || now.getTime() - info.mtimeMs < 3600000) continue;
    try {
      const owner = JSON.parse(await readFile(marker, 'utf8')) as { pid?: number };
      if (!Number.isSafeInteger(owner.pid) || owner.pid! <= 0) continue;
      try { process.kill(owner.pid!, 0); continue; } catch(error) { if((error as NodeJS.ErrnoException).code !== 'ESRCH') continue; }
    } catch(error) { if((error as NodeJS.ErrnoException).code !== 'ENOENT') continue; }
    await removeWorkspace(directory); removed++;
  }
  return removed;
}
export async function createVideoWorkspace() {
  await mkdir(ROOT, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(ROOT, 'job-'));
  const marker = join(directory, '.owner.json');
  try { await writeFile(marker, JSON.stringify({pid:process.pid}), {flag:'wx',mode:0o600}); }
  catch(error) { await removeWorkspace(directory); throw error; }
  active.add(directory);
  let beat: Promise<void> | undefined;
  const heartbeat = setInterval(() => { if (!beat) beat = utimes(marker,new Date(),new Date()).catch(()=>{}).finally(()=>{beat=undefined;}); },15000); heartbeat.unref();
  async function bytes(path: string): Promise<number> {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; }
    let total = 0;
    for (const entry of entries) {
      const file = join(path, entry.name);
      let info;
      try { info = await lstat(file); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      if (info.isSymbolicLink()) throw new VideoProbeError('INVALID_ARTIFACT');
      total += info.isDirectory() ? await bytes(file) : info.size;
      if (total > VIDEO_PROBE_LIMITS.maxWorkBytes) throw new VideoProbeError('VIDEO_TOO_LARGE');
    }
    return total;
  }
  return {
    directory,
    async checkBudget() { await bytes(directory); },
    async cleanup() {
      clearInterval(heartbeat); await beat;
      try { await removeWorkspace(directory); } finally { active.delete(directory); }
    },
  };
}
