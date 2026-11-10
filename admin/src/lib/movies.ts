export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://moviyai.onrender.com";

export type Movie = {
  catalogIdentity?:{originalTitle?:string|null};
  id: number;
  categoryName?: string | null;
  title?: { uz?: string | null; ru?: string | null };
  homeImgPoster?: string | null;
  ratingImdb?: number | null;
  ratingKinopoisk?: number | null;
  genre?: { uz?: string[]; ru?: string[] };
  description?: {
    uz?: {
      text?: string | null;
      director?: string | null;
      country?: string | null;
      year?: number | null;
      duration?: number | null;
    };
    ru?: {
      text?: string | null;
      director?: string | null;
      country?: string | null;
      year?: number | null;
      duration?: number | null;
    };
  };
  trailers?: string | null;
  watchUrl?: string | null;
  filterCountry?: string | null;
  filterGenre?: string[];
  like?: string;
  dislike?: string;
  specs?: {
    duration?: number | null;
    ageRating?: string | null;
    year?: number | null;
    countries?: string[];
  };
  franchiseMovieIds?: number[];
  actorIds?: number[];
};

export function mediaImageUrl(folder: "movieimg" | "actorimg" | "banner" | "adminimg", path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/${folder}/${encodeURIComponent(file)}`;
}

export function moviePosterUrl(path?: string | null) {
  return mediaImageUrl("movieimg", path);
}

export function actorImageUrl(path?: string | null) {
  return mediaImageUrl("actorimg", path);
}

export function bannerImageUrl(path?: string | null) {
  return mediaImageUrl("banner", path);
}

export type Banner = {
  _id: string;
  img: string;
  movieId: number[];
};

export async function fetchBanners(): Promise<Banner[]> {
  const response = await fetch(`${apiBaseUrl}/api/banners`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Bannerlar yuklanmadi");
  }
  const body = (await response.json()) as { data?: Banner[] };
  return Array.isArray(body.data) ? body.data : [];
}

export type Actor = {
  id: number;
  actorName?: string;
  actorImg?: string;
  actorAbout?: { uz?: string; ru?: string };
};

export function movieTitle(movie: Movie) {
  return movie.title?.uz || movie.title?.ru || movie.catalogIdentity?.originalTitle || "Kino";
}

export async function fetchMovies(): Promise<Movie[]> {
  const response = await fetch(`${apiBaseUrl}/api/movies`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Kinolar yuklanmadi");
  }
  const body = (await response.json()) as { data?: Movie[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchActors(): Promise<Actor[]> {
  const response = await fetch(`${apiBaseUrl}/api/actors`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Aktyorlar yuklanmadi");
  }
  const body = (await response.json()) as { data?: Actor[] };
  return Array.isArray(body.data) ? body.data : [];
}
