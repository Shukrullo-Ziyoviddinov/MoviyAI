/**
 * YouTube link / iframe / videoId → playable embed helpers.
 * Accepts:
 * - https://www.youtube.com/watch?v=ID&list=...&index=...
 * - https://youtu.be/ID
 * - https://www.youtube.com/embed/ID
 * - https://www.youtube.com/shorts/ID
 * - https://m.youtube.com/watch?v=ID
 * - <iframe src="https://www.youtube.com/embed/ID" ...></iframe>
 * - raw 11-char video id
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const ID_FROM_ANYWHERE_RE =
  /(?:youtube(?:-nocookie)?\.com\/(?:(?:watch|live)\?(?:[^"'<\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

const IFRAME_SRC_RE = /src=["']([^"']+)["']/i;

function normalizeInput(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, ' ');
}

export function extractYoutubeVideoId(input?: string | null): string | null {
  const raw = normalizeInput(input);
  if (!raw) return null;

  if (VIDEO_ID_RE.test(raw)) return raw;

  // iframe / embed HTML paste
  const iframeSrc = raw.match(IFRAME_SRC_RE)?.[1];
  if (iframeSrc) {
    const fromIframe = extractYoutubeVideoId(iframeSrc);
    if (fromIframe) return fromIframe;
  }

  // Decode once if URL-encoded
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep original
  }

  try {
    const withProtocol = /^https?:\/\//i.test(decoded)
      ? decoded
      : `https://${decoded.replace(/^\/\//, '')}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]?.split('?')[0];
      if (id && VIDEO_ID_RE.test(id)) return id;
    }

    if (
      host === 'youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      const v = url.searchParams.get('v');
      if (v && VIDEO_ID_RE.test(v)) return v;

      const parts = url.pathname.split('/').filter(Boolean);
      // /embed/ID | /shorts/ID | /live/ID | /v/ID
      if (
        parts.length >= 2 &&
        ['embed', 'shorts', 'live', 'v'].includes(parts[0]) &&
        VIDEO_ID_RE.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    // fall through
  }

  const match = decoded.match(ID_FROM_ANYWHERE_RE) ?? raw.match(ID_FROM_ANYWHERE_RE);
  return match?.[1] ?? null;
}

export function buildYoutubeEmbedUrl(input?: string | null): string | null {
  const id = extractYoutubeVideoId(input);
  if (!id) return null;
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',
    fs: '1',
    enablejsapi: '0',
  });
  // nocookie + explicit origin helps WebView play in-app instead of
  // pushing "Watch on YouTube" interstitial.
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function buildYoutubeEmbedHtml(input?: string | null): string | null {
  const embedUrl = buildYoutubeEmbedUrl(input);
  if (!embedUrl) return null;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #000;
        overflow: hidden;
      }
      .wrap, iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <iframe
        src="${embedUrl}"
        title="YouTube trailer"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="origin"
      ></iframe>
    </div>
  </body>
</html>`;
}
