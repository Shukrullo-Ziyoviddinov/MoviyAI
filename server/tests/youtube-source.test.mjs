import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareYouTubeSource } from '../dist/ai/video-import/services/youtube-source.service.js';
import { createVideoImportProcessor } from '../dist/ai/video-import/services/video-import-processor.service.js';
import { validatePreparedVideoResult } from '../dist/ai/video-import/validators/video-job.validator.js';
import { validateVideoUrl } from '../dist/ai/video-import/services/video-url.service.js';
import { CHAT_VIDEO } from '../dist/ai/config/chat-video.config.js';

const job = () => ({ id: 'a'.repeat(64), platform: 'youtube', videoId: 'pt4zDSv4ZoY',
  canonicalUrl: 'https://www.youtube.com/watch?v=pt4zDSv4ZoY', r2Key: null });
test('YouTube prepares canonical native input without downloader, filesystem or R2 calls', async () => {
  const stages = [];
  const unused = () => { throw Error('YouTube must not use a downloader or R2'); };
  const process = createVideoImportProcessor({ downloader: { withVideo: unused }, storage: { inspect: unused, upload: unused } });
  const result = await process(job(), new AbortController().signal, async patch => { stages.push(patch.stage); });
  assert.equal(result.transport, 'youtube'); assert.equal(result.r2Key, null);
  assert.equal(result.analysisSeconds, 180);
  assert.deepEqual(Object.values(result.metadata), [null, null, null, null, null, null]);
  assert.deepEqual(stages, ['url_check']);
});
test('native YouTube input cannot spoof hosts, change video identity, invent metadata or exceed the analysis cap', () => {
  const source = prepareYouTubeSource(job());
  for (const changed of [
    { canonicalUrl: 'https://youtube.com.evil.test/watch?v=pt4zDSv4ZoY' },
    { videoId: 'abcdefghijk' }, { analysisSeconds: 181 },
    { metadata: { ...source.metadata, durationSeconds: 42 } }, { r2Key: 'videoimport/private.mp4' },
  ]) assert.throws(() => validatePreparedVideoResult(job(), { ...source, ...changed }));
  assert.throws(() => prepareYouTubeSource({ ...job(), platform: 'instagram' }));
});
test('stopping before YouTube preparation prevents a ready result from being produced', async () => {
  const controller = new AbortController(); controller.abort(Error('stopped'));
  await assert.rejects(() => createVideoImportProcessor()(job(), controller.signal, async () => {}), /stopped/);
});
test('only exact YouTube URLs can use an analysis bound instead of an uploaded duration', () => {
  const source = readFileSync(new URL('../dist/ai/services/video-movie.service.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  let received;
  const { findMovieFromVideo } = new Function('findMovieFromImages', 'CHAT_VIDEO', 'validateVideoUrl', `${source}\nreturn {findMovieFromVideo};`)
    ((_text, media) => { received = media; return 'result'; }, CHAT_VIDEO, validateVideoUrl);
  const input = { mimeType: 'video/mp4', fileUri: job().canonicalUrl, analysisSeconds: 180 };
  assert.equal(findMovieFromVideo('Find it', [input]), 'result');
  assert.equal(received[0].durationSeconds, undefined);
  for (const invalid of [
    { ...input, analysisSeconds: 181 }, { ...input, analysisSeconds: 0 },
    { ...input, fileUri: 'https://r2.example/video.mp4' },
    { ...input, fileUri: 'https://youtube.com.evil.test/watch?v=pt4zDSv4ZoY' },
    { mimeType: 'video/mp4', fileUri: 'https://r2.example/video.mp4' },
  ]) assert.throws(() => findMovieFromVideo('Find it', [invalid]));
  assert.equal(findMovieFromVideo('Find it', [{ mimeType: 'video/mp4', fileUri: 'https://r2.example/video.mp4', durationSeconds: 42 }]), 'result');
});
