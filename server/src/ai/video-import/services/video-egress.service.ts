import { createServer } from 'node:http';
import { connect, isIP, type Socket } from 'node:net';
import { lookup } from 'node:dns/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { isPublicVideoAddress } from '../validators/public-address.validator.js';
import { VideoUrlError, type VideoAddress } from '../types/video-import.types.js';
import { VideoProbeError } from '../types/video-probe.types.js';
import { VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';

type Dependencies = {
  lookup: (host: string) => Promise<VideoAddress[]>;
  connect: (options: { host: string; port: number; family: number }) => Socket;
};
/** Job-private HTTPS CONNECT proxy. Every outbound connection gets checked DNS
 * and a pinned public IP; redirects cannot make yt-dlp reach local services. */
export async function createVideoEgress(signal: AbortSignal, deps: Dependencies = {
  lookup: host => lookup(host, { all: true, verbatim: true }), connect: options => connect(options),
}) {
  signal.throwIfAborted();
  const secret = randomBytes(24).toString('hex');
  const expected = Buffer.from(`Basic ${Buffer.from(`video:${secret}`).toString('base64')}`);
  const budget = new AbortController(), guarded = AbortSignal.any([signal, budget.signal]);
  const sockets = new Set<Socket>();
  let bytes = 0, active = 0, closed = false;
  const destroy = () => { for (const socket of sockets) socket.destroy(); };
  guarded.addEventListener('abort', destroy, { once: true });
  const server = createServer({ maxHeaderSize: 16384 }, (_req, res) => { res.writeHead(403); res.end(); });
  server.on('error', () => budget.abort(new VideoProbeError('NETWORK_ERROR')));
  server.on('connection', socket => { sockets.add(socket); socket.on('error', () => socket.destroy()); socket.once('close', () => sockets.delete(socket)); socket.setTimeout(20000, () => socket.destroy()); });
  server.on('connect', (req, stream, initial) => {
    const client = stream as Socket;
    const auth = Buffer.from(req.headers['proxy-authorization'] ?? '');
    if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) { client.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n'); return; }
    if (closed || guarded.aborted || active >= 8) { client.end('HTTP/1.1 503 Service Unavailable\r\n\r\n'); return; }
    const match = /^([a-zA-Z0-9.-]+):443$/.exec(req.url ?? '');
    if (!match || isIP(match[1]) || !match[1].includes('.') || /(?:^|\.)(?:localhost|local|internal)$/.test(match[1]) || match[1].endsWith('.')) {
      budget.abort(new VideoUrlError('UNSAFE_ADDRESS')); return;
    }
    active++; client.once('close', () => { active--; });
    void (async () => {
      const deadline = AbortSignal.any([guarded, AbortSignal.timeout(5000)]);
      let abort: (() => void) | undefined;
      let addresses: VideoAddress[];
      try {
        addresses = await Promise.race([deps.lookup(match[1]), new Promise<never>((_resolve, reject) => {
          abort = () => reject(deadline.reason);
          deadline.addEventListener('abort', abort, { once: true });
          if (deadline.aborted) abort();
        })]);
      } finally { if (abort) deadline.removeEventListener('abort', abort); }
      guarded.throwIfAborted();
      if (!addresses.length || addresses.some(item => isIP(item.address) !== item.family || !isPublicVideoAddress(item.address))) {
        budget.abort(new VideoUrlError('UNSAFE_ADDRESS')); return;
      }
      if (client.destroyed) return;
      const address = addresses.find(item => item.family === 4) ?? addresses[0];
      const upstream = deps.connect({ host: address.address, family: address.family, port: 443 });
      sockets.add(upstream);
      const connectionTimeout = setTimeout(() => upstream.destroy(), 5000); connectionTimeout.unref();
      upstream.once('close', () => { clearTimeout(connectionTimeout); sockets.delete(upstream); client.destroy(); });
      upstream.on('error', () => client.destroy()); client.on('error', () => upstream.destroy());
      client.once('close', () => upstream.destroy());
      upstream.setTimeout(20000, () => upstream.destroy());
      upstream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > VIDEO_PROBE_LIMITS.maxWorkBytes) budget.abort(new VideoProbeError('VIDEO_TOO_LARGE'));
      });
      upstream.once('connect', () => {
        clearTimeout(connectionTimeout);
        if (guarded.aborted || client.destroyed) { upstream.destroy(); return; }
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (initial.length) upstream.write(initial);
        client.pipe(upstream); upstream.pipe(client);
      });
    })().catch(() => { if (!client.destroyed) client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); });
  });
  server.on('clientError', (_error, socket) => socket.destroy());
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject); server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    guarded.throwIfAborted();
  } catch (error) { destroy(); guarded.removeEventListener('abort', destroy); server.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new VideoProbeError('NETWORK_ERROR');
  return {
    url: `http://video:${secret}@127.0.0.1:${address.port}`,
    signal: guarded,
    async close() {
      closed = true; guarded.removeEventListener('abort', destroy); destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
