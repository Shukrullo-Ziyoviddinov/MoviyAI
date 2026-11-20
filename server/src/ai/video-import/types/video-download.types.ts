import type { ResolvedVideoUrl } from './video-import.types.js';
import type { StoredVideoImportResult } from './video-import-job.types.js';

export type DownloadStage = 'url_check' | 'downloading' | 'probing';
export type DownloadOptions = { signal?: AbortSignal; onProgress?: (stage: DownloadStage) => void | Promise<void> };
export type DownloadedVideo = {
  source: ResolvedVideoUrl;
  filePath: string;
  sha256: string;
  metadata: StoredVideoImportResult['metadata'];
  converted: boolean;
};
