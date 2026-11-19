import { createVideoImportWorker } from './video-import-worker.service.js';
import { videoImportProcessor } from './video-import-processor.service.js';
import { recognizeImportedVideo } from './video-import-recognition.service.js';

/** Download queue and owner-scoped analysis entry point. UI hookup is step 7. */
export function createVideoImportPipeline() {
  return { ...createVideoImportWorker({ process: videoImportProcessor }), recognize: recognizeImportedVideo };
}
