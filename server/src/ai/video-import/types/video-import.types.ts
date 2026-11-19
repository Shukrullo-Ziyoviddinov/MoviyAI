export type VideoPlatform = 'instagram' | 'youtube' | 'tiktok';

type VideoUrlBase = { platform: VideoPlatform; originalUrl: string; canonicalUrl: string };
export type ValidatedVideoUrl = VideoUrlBase & (
  { kind: 'video'; videoId: string; needsResolution: false }
  | { kind: 'short'; videoId: null; needsResolution: true }
);
export type ResolvedVideoUrl = Extract<ValidatedVideoUrl, { kind: 'video' }>;
export type VideoUrlErrorCode = 'INVALID_URL' | 'UNSAFE_URL' | 'UNSUPPORTED_PLATFORM' | 'UNSUPPORTED_VIDEO_URL'
  | 'MULTIPLE_VIDEO_URLS' | 'TEXT_TOO_LONG' | 'UNSAFE_ADDRESS' | 'DNS_FAILED'
  | 'REDIRECT_LIMIT' | 'REDIRECT_LOOP' | 'CROSS_PLATFORM_REDIRECT' | 'SHORT_URL_UNRESOLVED' | 'LINK_TIMEOUT' | 'LINK_UNAVAILABLE';

export class VideoUrlError extends Error {
  constructor(public readonly code: VideoUrlErrorCode) {
    // Never put user URLs, signed query strings or network request details in errors.
    super(`VIDEO_IMPORT_${code}`);
    this.name = 'VideoUrlError';
  }
}
export type VideoAddress = { address: string; family: number };
export type VideoRedirectResponse = { status: number; location?: string };
