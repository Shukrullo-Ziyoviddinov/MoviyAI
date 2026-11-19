export const VIDEO_URL_LIMITS = {
  textLength: 20000,
  urlLength: 2048,
  redirects: 5,
  resolutionMs: 10000,
  requestMs: 5000,
} as const;

// Shared MongoDB slots enforce this limit across worker instances, not just one process.
export const VIDEO_IMPORT_QUEUE = {
  parallel: 1,
  leaseMs: 60000,
  heartbeatMs: 15000,
  jobTimeoutMs: 240000,
  pollMs: 5000,
  maxAttempts: 3,
  retryMs: [10000, 30000] as readonly number[],
} as const;

// Exact hostnames only. Video/CDN downloads require a separate network policy.
export const VIDEO_PLATFORM_HOSTS = {
  instagram: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
} as const;
