import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { checkVideoTools, probeVideoDownload } from '../dist/ai/video-import/services/video-downloader-probe.service.js';

const args = process.argv.slice(2);
const allowed = new Set(['--url', '--metadata-only', '--check']);
let url;
for (let index = 0; index < args.length; index++) {
  if (!allowed.has(args[index])) throw Error('Usage: --check OR --url HTTPS_VIDEO_URL [--metadata-only]');
  if (args[index] === '--url') { if (url || !args[index + 1]) throw Error('Exactly one --url is required.'); url = args[++index]; }
}
const controller = new AbortController();
const stop = () => controller.abort(new Error('OPERATOR_STOPPED'));
process.once('SIGINT', stop); process.once('SIGTERM', stop);
const report = { startedAt: new Date().toISOString(), environment: process.env.RENDER ? 'render' : 'local', node: process.version,
  integrations: { database: false, r2: false, gemini: false, telegram: false } };
let phase = 'tools';
try {
  report.tools = await checkVideoTools();
  if (url) {
    phase = 'download-probe';
    report.result = await probeVideoDownload(url, { metadataOnly: args.includes('--metadata-only'), signal: controller.signal });
  } else if (!args.includes('--check')) throw Error('URL_REQUIRED');
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.failure = { phase, code: error.name === 'TimeoutError' ? 'PROCESS_TIMEOUT' : typeof error.code === 'string' ? error.code : controller.signal.aborted ? 'OPERATOR_STOPPED' : 'PROBE_FAILED' };
  if (typeof error.tool === 'string') report.failure.tool = error.tool;
  process.exitCode = 1;
} finally {
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
  report.finishedAt = new Date().toISOString();
  const directory = fileURLToPath(new URL('../.qa-video-import/', import.meta.url));
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}latest-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
