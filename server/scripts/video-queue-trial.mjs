// Operator-only real-Mongo restart/concurrency test. Never touches app collections.
import mongoose from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from '../dist/config/env.js';
import { VideoImportJobModel, VideoImportSlotModel } from '../dist/ai/video-import/models/video-import.model.js';
import { VideoImportJobError } from '../dist/ai/video-import/types/video-import-job.types.js';
import { VIDEO_IMPORT_QUEUE } from '../dist/ai/video-import/config/video-import.config.js';
import { createVideoImportService } from '../dist/ai/video-import/services/video-import.service.js';

const child = process.argv[2];
if (child && !['--checkpoint', '--resume', '--contend'].includes(child)) throw Error('INVALID_QA_PHASE');
const namespace = child ? process.env.VIDEO_QA_NAMESPACE : randomBytes(8).toString('hex');
if (!/^[a-f0-9]{16}$/.test(namespace ?? '')) throw Error('INVALID_QA_NAMESPACE');
const names = { jobs: `qa_video_import_jobs_${namespace}`, slots: `qa_video_import_slots_${namespace}` };
const report = { environment: 'local-real-mongodb', appCollectionsModified: false, mediaDownloaded: false, r2ObjectsCreated: false, leaseExpirySimulated: true };
let db;
async function runChild(phase) {
  return new Promise((resolve, reject) => {
    const task = spawn(process.execPath, [fileURLToPath(import.meta.url), phase], {
      env: { ...process.env, VIDEO_QA_NAMESPACE: namespace }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = ''; const timer = setTimeout(() => { task.kill(); reject(Error('QA_CHILD_TIMEOUT')); }, 35000);
    task.stdout.on('data', chunk => { if (output.length < 65536) output += chunk.toString(); });
    task.stderr.resume();
    task.once('error', () => { clearTimeout(timer); reject(Error('QA_CHILD_FAILED')); });
    task.once('close', code => {
      clearTimeout(timer);
      if (code !== 0) { reject(Error('QA_CHILD_FAILED')); return; }
      try { resolve(JSON.parse(output.trim().split(/\r?\n/).at(-1))); } catch { reject(Error('QA_CHILD_OUTPUT')); }
    });
  });
}
try {
  db = await mongoose.createConnection(env.mongodbUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 3 }).asPromise();
  const jobsSchema = VideoImportJobModel.schema.clone(), slotsSchema = VideoImportSlotModel.schema.clone();
  jobsSchema.set('collection', names.jobs); slotsSchema.set('collection', names.slots);
  const jobs = db.model('QaVideoImportJob', jobsSchema, names.jobs), slots = db.model('QaVideoImportSlot', slotsSchema, names.slots);
  const code = (await readFile(new URL('../dist/ai/video-import/repositories/video-import-job.repository.js', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  const repository = new Function('VideoImportJobModel', 'VideoImportSlotModel', 'VIDEO_IMPORT_QUEUE', 'VideoImportJobError', `${code}\nreturn videoImportJobRepository;`)(jobs, slots, VIDEO_IMPORT_QUEUE, VideoImportJobError);
  const service = createVideoImportService(repository), owner = { kind: 'user', id: `qa-${namespace}` };
  const claim = () => repository.claim(new Date(), randomUUID(), new Date(Date.now() + 60000));
  if (child) {
    const job = await claim();
    if (child === '--contend') console.log(JSON.stringify({ claimed: !!job }));
    else {
      if (!job) throw Error('QA_NO_JOB');
      if (child === '--checkpoint') {
        const metadata = { durationSeconds: 10, sizeBytes: 1024, mimeType: 'video/mp4', width: 640, height: 360, hasAudio: false };
        if (!await repository.checkpoint(job, { stage: 'uploading', r2Key: `videoimport/${job.id}/${'a'.repeat(64)}.mp4`, metadata }, new Date())) throw Error('QA_CHECKPOINT_FAILED');
        console.log(JSON.stringify({ checkpointSaved: true }));
        // Deliberately leave the durable lease behind, as a stopped process does.
      } else {
        if (job.stage !== 'uploading' || job.metadata.durationSeconds !== 10 || !job.r2Key) throw Error('QA_CHECKPOINT_LOST');
        if (!await repository.complete(job, { canonicalUrl: job.canonicalUrl, videoId: job.videoId, r2Key: job.r2Key, metadata: job.metadata }, new Date())) throw Error('QA_COMPLETE_FAILED');
        await repository.release(job); console.log(JSON.stringify({ resumed: true }));
      }
    }
  } else {
    await Promise.all([jobs.init(), slots.init()]);
    const input = { conversationId: 'qa-conversation', requestId: 'qa-request', url: 'https://youtu.be/GYheraiHCjs' };
    const duplicates = await Promise.all(Array.from({ length: 8 }, () => service.enqueue(owner, input)));
    if (new Set(duplicates.map(item => item.id)).size !== 1 || await jobs.countDocuments() !== 1) throw Error('QA_DUPLICATE');
    if (await service.get({ kind: 'user', id: 'qa-foreign' }, duplicates[0].id)) throw Error('QA_OWNERSHIP');
    await runChild('--checkpoint');
    await jobs.updateMany({}, { $set: { leaseUntil: new Date(0) } });
    await slots.updateMany({}, { $set: { leaseUntil: new Date(0) } });
    await runChild('--resume');
    if ((await service.get(owner, duplicates[0].id))?.status !== 'completed') throw Error('QA_RESTART_FAILED');
    await service.enqueue(owner, { ...input, requestId: 'qa-parallel-1' });
    await service.enqueue(owner, { ...input, requestId: 'qa-parallel-2' });
    const contenders = await Promise.all([runChild('--contend'), runChild('--contend')]);
    if (contenders.filter(item => item.claimed).length !== 1) throw Error('QA_PARALLEL_LIMIT');
    Object.assign(report, { duplicateRequests: 'passed', ownership: 'passed', separateProcessResume: 'passed', separateProcessParallelLimit: 'passed', ok: true });
  }
} catch (error) {
  if (child) { console.log(JSON.stringify({ ok: false, code: 'QA_CHILD_FAILED' })); process.exitCode = 1; }
  else { Object.assign(report, { ok: false, code: /^[A-Z_]{1,64}$/.test(error.message ?? '') ? error.message : 'QA_DATABASE_UNAVAILABLE',
    errorKind: /^[a-zA-Z_]{1,64}$/.test(error.name ?? '') ? error.name : 'UnknownError',
    transportCode: /^[A-Z_]{1,64}$/.test(String(error.code ?? '')) ? error.code : null }); process.exitCode = 1; }
} finally {
  if (db) {
    if (!child) {
      for (const name of Object.values(names)) {
        if (!/^qa_video_import_(jobs|slots)_[a-f0-9]{16}$/.test(name) || !name.endsWith(namespace)) throw Error('INVALID_QA_CLEANUP_TARGET');
        try { await db.dropCollection(name); }
        catch (error) { if (error.codeName !== 'NamespaceNotFound' && error.code !== 26) { report.cleanupPending = true; report.ok = false; process.exitCode = 1; } }
      }
    }
    await db.close();
  }
  if (!child) console.log(JSON.stringify({ ...report, isolatedCollectionsRemoved: !!db && !report.cleanupPending }, null, 2));
}
