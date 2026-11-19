import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createVideoDownloaderProbe, validateProbeMetadata, videoDownloaderArguments } from '../dist/ai/video-import/services/video-downloader-probe.service.js';
import { runVideoProcess, classifyVideoToolFailure } from '../dist/ai/video-import/services/video-process.service.js';
import { VIDEO_IMPORT_SERVER_ROOT } from '../dist/ai/video-import/config/video-tools.config.js';
import { createVideoWorkspace } from '../dist/ai/video-import/services/video-workspace.service.js';
import { createVideoProcessor } from '../dist/ai/video-import/services/video-processor.service.js';

const code = value => error => error.code === value;
test('metadata checks public availability, duration and media size, without inventing absent Instagram duration', () => {
  assert.equal(validateProbeMetadata({ id: 'example' }).duration, null);
  assert.equal(validateProbeMetadata({ id: 'example', duration: 30 }).duration, 30);
  for (const [data, expected] of [
    [{ id: 'x', duration: 181 }, 'VIDEO_TOO_LONG'], [{ id: 'x', duration: '30' }, 'INVALID_METADATA'],
    [{ id: 'x', duration: 1, _type: 'playlist' }, 'INVALID_METADATA'], [{ id: 'x', duration: 1, is_live: true }, 'LIVE_VIDEO'],
    [{ id: 'x', duration: 1, availability: 'private' }, 'PLATFORM_BLOCKED'],
    [{ id: 'x', duration: 1, filesize: 81 * 1024 * 1024 }, 'VIDEO_TOO_LARGE'],
  ]) assert.throws(() => validateProbeMetadata(data), code(expected));
});
test('tool arguments disable external configuration and plugins, restrict extractors and keep paths as single arguments', () => {
  const args = videoDownloaderArguments('youtube', 'C:\\node with spaces\\node.exe', 'C:\\ffmpeg with spaces\\ffmpeg.exe');
  for (const option of ['--ignore-config', '--no-plugin-dirs', '--no-cache-dir', '--no-playlist', '--no-remote-components']) assert.ok(args.includes(option));
  assert.equal(args[args.indexOf('--js-runtimes') + 1], 'node:C:\\node with spaces\\node.exe');
  assert.equal(args[args.indexOf('--use-extractors') + 1], 'youtube,end');
  assert.equal(args.includes('--cookies'), false); assert.equal(args.includes('--no-check-certificates'), false);
});
test('child process uses literal arguments without a shell and does not inherit application secrets', async () => {
  process.env.VIDEO_PROBE_TEST_SECRET = 'never-forward-this';
  try {
    const result = await runVideoProcess(process.execPath, ['-e', 'console.log(JSON.stringify({arg:process.argv[1],secret:process.env.VIDEO_PROBE_TEST_SECRET??null}))', 'literal;echo unsafe'], { cwd: VIDEO_IMPORT_SERVER_ROOT });
    assert.deepEqual(JSON.parse(result.stdout), { arg: 'literal;echo unsafe', secret: null });
  } finally { delete process.env.VIDEO_PROBE_TEST_SECRET; }
});
test('missing tools, bounded output and process timeouts fail with sanitized codes', async () => {
  await assert.rejects(() => runVideoProcess(join(VIDEO_IMPORT_SERVER_ROOT, 'nonexistent-video-tool'), [], { cwd: VIDEO_IMPORT_SERVER_ROOT }), code('TOOL_MISSING'));
  await assert.rejects(() => runVideoProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(3*1024*1024));setInterval(()=>{},1000)'], { cwd: VIDEO_IMPORT_SERVER_ROOT }), code('PROCESS_OUTPUT_LIMIT'));
  await assert.rejects(() => runVideoProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: VIDEO_IMPORT_SERVER_ROOT, timeoutMs: 50 }), code('PROCESS_TIMEOUT'));
});
test('stop cancels a child process without starting another request', async () => {
  const controller = new AbortController();
  const pending = runVideoProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: VIDEO_IMPORT_SERVER_ROOT, signal: controller.signal });
  controller.abort(new Error('Stopped by operator'));
  await assert.rejects(() => pending, /Stopped by operator/);
});
test('platform errors are classified without returning raw URLs or provider output', () => {
  assert.equal(classifyVideoToolFailure('Sign in to confirm you are not a bot https://private.example/token').code, 'PLATFORM_BLOCKED');
  assert.equal(classifyVideoToolFailure('404 removed').code, 'VIDEO_UNAVAILABLE');
  assert.equal(classifyVideoToolFailure('connection timed out').code, 'NETWORK_ERROR');
  assert.equal(classifyVideoToolFailure('secret raw data').message.includes('secret'), false);
});
function probeHarness({ failDownload = false, duration = 10 } = {}) {
  const directories = [], calls = [];
  const probe = createVideoDownloaderProbe({
    createVideoWorkspace,
    createVideoEgress: async signal => ({ url: 'http://local-test-proxy', signal, close: async () => {} }),
    videoProcessor: createVideoProcessor({ videoTools: () => ({ ffprobe: 'fake-ffprobe', ffmpeg: 'fake-ffmpeg' }), runVideoProcess: async (_executable, args) => ({ stdout: args.includes('-show_format') ? JSON.stringify({ format: { duration: String(duration), format_name: 'mov,mp4' }, streams: [{ index: 0, codec_type: 'video', codec_name: 'h264', width: 640, height: 360 }, { codec_type: 'audio', codec_name: 'aac' }] }) : '', stderr: '' }) }),
    resolveVideoUrl: async () => ({ platform: 'instagram', videoId: 'fixture', canonicalUrl: 'https://www.instagram.com/reel/fixture/', originalUrl: '', kind: 'video', needsResolution: false }),
    videoTools: () => ({ ytdlp: 'fake-ytdlp', js: process.execPath, ffmpeg: 'fake-ffmpeg', ffprobe: 'fake-ffprobe' }),
    runVideoProcess: async (executable, args, options) => {
      calls.push(args); directories.push(options.cwd);
      if (args.includes('--dump-single-json')) return { stdout: JSON.stringify({ id: 'fixture' }), stderr: '' };
      if (args.includes('-o')) {
        const bytes = Buffer.alloc(64); bytes.write('ftypisom', 4);
        await writeFile(join(options.cwd, 'source.mp4'), bytes);
        if (failDownload) throw Error('Simulated download failure');
        return { stdout: '', stderr: '' };
      }
      assert.equal(executable, 'fake-ffprobe');
      return { stdout: JSON.stringify({ format: { duration: String(duration) }, streams: [{ codec_type: 'video', width: 640, height: 360 }, { codec_type: 'audio' }] }), stderr: '' };
    },
  });
  return { probe, directories, calls };
}
test('a bounded download verifies real-file metadata and removes its temporary workspace', async () => {
  const h = probeHarness(); const result = await h.probe('fixture');
  assert.equal(result.status, 'downloaded-and-probed'); assert.equal(result.duration, 10); assert.equal(result.audio, true);
  assert.ok(h.calls.every(args => args.includes('--proxy')));
  assert.ok(h.calls.every(args => !args.includes('--remux-video')));
  for (const path of h.directories) await assert.rejects(() => access(path), { code: 'ENOENT' });
});
test('download failures and unexpectedly long files clean their workspaces too', async () => {
  const failed = probeHarness({ failDownload: true }); await assert.rejects(() => failed.probe('fixture'), /Simulated/);
  for (const path of failed.directories) await assert.rejects(() => access(path), { code: 'ENOENT' });
  const long = probeHarness({ duration: 181 }); await assert.rejects(() => long.probe('fixture'), code('VIDEO_TOO_LONG'));
  for (const path of long.directories) await assert.rejects(() => access(path), { code: 'ENOENT' });
});
