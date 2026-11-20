import { createVideoImportWorker } from './video-import-worker.service.js';
import { videoImportProcessor } from './video-import-processor.service.js';
import { recognizeImportedVideo } from './video-import-recognition.service.js';

/** Shared preparation queue and owner-scoped analysis for stored/native media. */
export function createVideoImportPipeline() {
  return { ...createVideoImportWorker({ process: videoImportProcessor }), recognize: recognizeImportedVideo };
}
