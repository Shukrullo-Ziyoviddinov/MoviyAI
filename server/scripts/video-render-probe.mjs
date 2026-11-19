import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Build-time operator trial. It never starts/imports the application server.
const root = fileURLToPath(new URL('../', import.meta.url));
const script = fileURLToPath(new URL('./video-downloader-trial.mjs', import.meta.url));
const url = process.env.VIDEO_IMPORT_PROBE_URL?.trim();
const child = spawn(process.execPath, [script, ...(url ? ['--url', url] : ['--check'])], {
  cwd: root, shell: false, windowsHide: true, stdio: 'inherit',
});
child.once('error', () => { console.error('Video probe could not start.'); process.exitCode = 1; });
child.once('close', code => { process.exitCode = code ?? 1; });
