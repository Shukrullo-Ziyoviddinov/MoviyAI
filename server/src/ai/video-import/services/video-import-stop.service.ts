import { videoImportService } from './video-import.service.js';
import { VideoRecognitionModel } from '../models/video-recognition.model.js';
import { abortVideoImport } from './video-import-controls.service.js';
import { ChatFailure } from '../../types/chat-progress.types.js';
import type { VideoImportOwner } from '../types/video-import-job.types.js';
export async function pauseVideoImport(owner: VideoImportOwner, id: string) {
  if (!await videoImportService.get(owner, id)) return;
  try {
    await videoImportService.cancel(owner, id);
    await VideoRecognitionModel.updateOne({ _id: id, status: 'processing' }, { $set: { pauseRequested: true } });
  } finally { abortVideoImport(id, new ChatFailure('stopped')); }
}
