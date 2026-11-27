export const siteName = "MoviyAI";

export function siteOrigin() {
  const value = process.env.SITE_URL?.trim() || "https://www.moviyai.uz";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an absolute HTTP(S) origin");
  }
  return url.origin;
}

export function moviePath(id: number) {
  return `/movie/${id}`;
}
