import { VIDEO_PLATFORM_HOSTS, VIDEO_URL_LIMITS } from '../config/video-import.config.js';
import { VideoUrlError, type ValidatedVideoUrl, type VideoPlatform } from '../types/video-import.types.js';

export function validateVideoUrl(value: string): ValidatedVideoUrl {
  if (typeof value !== 'string' || !value.trim() || value.length > VIDEO_URL_LIMITS.urlLength) throw new VideoUrlError('INVALID_URL');
  const originalUrl = value.trim();
  if (!/^https:\/\/[^/]/i.test(originalUrl) || /[\u0000-\u0020\u007f\\]/.test(originalUrl)) throw new VideoUrlError('UNSAFE_URL');
  let url: URL;
  try { url = new URL(originalUrl); } catch { throw new VideoUrlError('INVALID_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new VideoUrlError('UNSAFE_URL');
  const platform = (Object.keys(VIDEO_PLATFORM_HOSTS) as VideoPlatform[])
    .find(key => (VIDEO_PLATFORM_HOSTS[key] as readonly string[]).includes(url.hostname));
  if (!platform) throw new VideoUrlError('UNSUPPORTED_PLATFORM');
  const video = (videoId: string, canonicalUrl: string): ValidatedVideoUrl => ({ platform, originalUrl, canonicalUrl, kind: 'video', videoId, needsResolution: false });
  if (platform === 'youtube') {
    let id: string | undefined;
    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    else if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v') ?? undefined;
    else id = /^\/shorts\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) throw new VideoUrlError('UNSUPPORTED_VIDEO_URL');
    return video(id, `https://www.youtube.com/watch?v=${id}`);
  }
  if (platform === 'instagram') {
    const match = /^\/(reel|p|tv)\/([\w-]{1,64})\/?$/.exec(url.pathname);
    if (!match) throw new VideoUrlError('UNSUPPORTED_VIDEO_URL');
    return video(match[2], `https://www.instagram.com/${match[1]}/${match[2]}/`);
  }
  const match = /^\/@([A-Za-z0-9_.]{1,64})\/video\/([1-9]\d{9,24})\/?$/.exec(url.pathname);
  if (match && !['vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname))
    return video(match[2], `https://www.tiktok.com/@${match[1]}/video/${match[2]}`);
  const short = ['vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname)
    ? /^\/([A-Za-z0-9]{1,64})\/?$/.exec(url.pathname)
    : /^\/t\/([A-Za-z0-9]{1,64})\/?$/.exec(url.pathname);
  if (short) return { platform, originalUrl, canonicalUrl: `https://${url.hostname}${['vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname) ? '/' : '/t/'}${short[1]}/`, kind: 'short', videoId: null, needsResolution: true };
  throw new VideoUrlError('UNSUPPORTED_VIDEO_URL');
}

/** No URL means ordinary chat. Invalid/unsupported URLs are explicit errors. */
export function extractVideoUrl(text: string): ValidatedVideoUrl | null {
  if (typeof text !== 'string' || text.length > VIDEO_URL_LIMITS.textLength) throw new VideoUrlError('TEXT_TOO_LONG');
  const matches = [...text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)].map(match => {
    let value = match[0].replace(/[.,!?;:]+$/g, '');
    // Markdown links / surrounding prose can add a closing delimiter.
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (value.endsWith(close) && value.split(close).length > value.split(open).length) value = value.slice(0, -1);
    }
    return value;
  });
  if (!matches.length) return null;
  const candidates = matches.map(validateVideoUrl);
  const unique = new Map(candidates.map(candidate => [candidate.canonicalUrl, candidate]));
  if (unique.size > 1) throw new VideoUrlError('MULTIPLE_VIDEO_URLS');
  return unique.values().next().value ?? null;
}
