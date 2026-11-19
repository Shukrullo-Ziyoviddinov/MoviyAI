import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { VIDEO_URL_LIMITS } from '../config/video-import.config.js';
import { isPublicVideoAddress } from '../validators/public-address.validator.js';
import { validateVideoUrl } from './video-url.service.js';
import { VideoUrlError, type VideoAddress, type VideoRedirectResponse, type ResolvedVideoUrl } from '../types/video-import.types.js';

type Dependencies = {
  lookup: (hostname: string) => Promise<VideoAddress[]>;
  head: (url: URL, address: VideoAddress, signal: AbortSignal) => Promise<VideoRedirectResponse>;
};

function head(url: URL, address: VideoAddress, signal: AbortSignal): Promise<VideoRedirectResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: 'HEAD', signal, maxHeaderSize: 16384,
      // Pin the checked address for this connection. TLS still verifies url.hostname.
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
      headers: { 'User-Agent': 'MoviyAI-LinkValidator/1.0', Accept: '*/*' },
    }, response => {
      const location = response.headers.location;
      resolve({ status: response.statusCode ?? 0, ...(location ? { location } : {}) });
      response.destroy(); // No video/page body is downloaded in URL validation.
    });
    req.setTimeout(VIDEO_URL_LIMITS.requestMs, () => req.destroy(new VideoUrlError('LINK_TIMEOUT')));
    req.once('error', reject);
    req.end();
  });
}

function withinDeadline<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function createVideoUrlResolver(deps: Dependencies = {
  lookup: hostname => lookup(hostname, { all: true, verbatim: true }), head,
}) {
  return async function resolveVideoUrl(value: string, options: { signal?: AbortSignal } = {}): Promise<ResolvedVideoUrl> {
    const timeout = AbortSignal.timeout(VIDEO_URL_LIMITS.resolutionMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    const original = validateVideoUrl(value);
    let current = original;
    const visited = new Set<string>();
    let redirects = 0;
    try {
      while (true) {
        signal.throwIfAborted();
        if (visited.has(current.canonicalUrl)) throw new VideoUrlError('REDIRECT_LOOP');
        visited.add(current.canonicalUrl);
        const url = new URL(current.canonicalUrl);
        let addresses: VideoAddress[];
        try { addresses = await withinDeadline(deps.lookup(url.hostname), signal); }
        catch (error) { if (signal.aborted) throw error; throw new VideoUrlError('DNS_FAILED'); }
        if (!addresses.length || addresses.some(address => isIP(address.address) !== address.family || !isPublicVideoAddress(address.address)))
          throw new VideoUrlError('UNSAFE_ADDRESS');
        if (!current.needsResolution) return { ...current, originalUrl: original.originalUrl };
        if (redirects >= VIDEO_URL_LIMITS.redirects) throw new VideoUrlError('REDIRECT_LIMIT');
        const response = await withinDeadline(deps.head(url, addresses.find(address => address.family === 4) ?? addresses[0], signal), signal);
        if (![301, 302, 303, 307, 308].includes(response.status) || !response.location)
          throw new VideoUrlError(response.status >= 400 ? 'LINK_UNAVAILABLE' : 'SHORT_URL_UNRESOLVED');
        let next: string;
        try { next = new URL(response.location, url).href; }
        catch { throw new VideoUrlError('UNSAFE_URL'); }
        current = validateVideoUrl(next);
        if (current.platform !== original.platform) throw new VideoUrlError('CROSS_PLATFORM_REDIRECT');
        redirects++;
      }
    } catch (error) {
      if (options.signal?.aborted) throw options.signal.reason;
      if (signal.aborted || error instanceof VideoUrlError && error.code === 'LINK_TIMEOUT') throw new VideoUrlError('LINK_TIMEOUT');
      if (error instanceof VideoUrlError) throw error;
      throw new VideoUrlError('LINK_UNAVAILABLE');
    }
  };
}

export const resolveVideoUrl = createVideoUrlResolver();
