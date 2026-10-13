const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const ID_FROM_URL_RE =
  /(?:youtube(?:-nocookie)?\.com\/(?:(?:watch|live)\?(?:[^"'<\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

export function extractYoutubeVideoId(input?: string | null): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (VIDEO_ID_RE.test(raw)) return raw;
  const iframe = raw.match(/src=["']([^"']+)["']/i)?.[1];
  if (iframe && iframe !== raw) return extractYoutubeVideoId(iframe);
  return raw.match(ID_FROM_URL_RE)?.[1] ?? null;
}

export function youtubeThumbnailUrl(input?: string | null) {
  const id = extractYoutubeVideoId(input);
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
