const posters = new Map<string, Promise<string | null>>();

function canvasPoster(source: CanvasImageSource, width: number, height: number): string | null {
  if (!width || !height) return null;
  const scale = Math.min(320 / width, 480 / height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

/** Decode one frame without relying on WebView autoplay/first-frame painting. */
async function decodedPoster(uri: string): Promise<string | null> {
  if (!('VideoDecoder' in globalThis)) return null;
  let input: import('mediabunny').Input | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const bunny = await import('mediabunny');
        if (expired) return null;
        input = new bunny.Input({ source: new bunny.UrlSource(uri, { maxCacheSize: 2 * 1024 * 1024,
          parallelism: 1, getRetryDelay: () => null, handleUnhandledError: () => {} }), formats: bunny.ALL_FORMATS });
        const track = await input.getPrimaryVideoTrack();
        if (!track || expired) return null;
        const scale = Math.min(320 / track.displayWidth, 480 / track.displayHeight, 1);
        const frame = await new bunny.CanvasSink(track, { width: Math.max(1, Math.round(track.displayWidth * scale)),
          height: Math.max(1, Math.round(track.displayHeight * scale)), fit: 'contain', poolSize: 1 }).getCanvas(0.1);
        if (!frame || expired) return null;
        return canvasPoster(frame.canvas, frame.canvas.width, frame.canvas.height);
      })().catch(() => null),
      new Promise<null>(resolve => { timer = setTimeout(() => { expired = true; resolve(null); }, 5000); }),
    ]);
  } finally { clearTimeout(timer); expired = true; input?.dispose(); }
}

/** Older WebViews can still supply a frame after an explicit inline seek. */
function mediaPoster(uri: string): Promise<string | null> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    let finished = false;
    const timer = setTimeout(() => finish(null), 5000);
    const finish = (poster: string | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.onloadedmetadata = null; video.onloadeddata = null; video.onseeked = null; video.onerror = null;
      video.pause(); video.removeAttribute('src'); video.load();
      resolve(poster);
    };
    const capture = () => {
      if (finished || video.readyState < 2 || video.seeking) return;
      try { finish(canvasPoster(video, video.videoWidth, video.videoHeight)); }
      catch { finish(null); }
    };
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      try { video.currentTime = Number.isFinite(video.duration) ? Math.min(0.1, video.duration / 2) : 0.1; }
      catch { capture(); }
    };
    video.onloadeddata = capture; video.onseeked = capture; video.onerror = () => finish(null);
    video.src = uri;
    video.load();
  });
}

/** Small, bounded browser-memory cache; no uploads and no Render processing. */
export function videoPoster(uri: string): Promise<string | null> {
  const cached = posters.get(uri);
  if (cached) return cached;
  const pending = (async () => await decodedPoster(uri) ?? await mediaPoster(uri))().catch(() => null);
  posters.set(uri, pending);
  void pending.then(image => { if (!image && posters.get(uri) === pending) posters.delete(uri); });
  while (posters.size > 16) posters.delete(posters.keys().next().value!);
  return pending;
}
