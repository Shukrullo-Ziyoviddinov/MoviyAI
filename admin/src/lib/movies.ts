export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://moviyai.onrender.com";

export type Movie = {
  id: number;
  title?: { uz?: string; ru?: string };
  homeImgPoster?: string;
  ratingImdb?: number;
  ratingKinopoisk?: number;
  genre?: { uz?: string[]; ru?: string[] };
  description?: {
    uz?: {
      text?: string;
      director?: string;
      country?: string;
      year?: number;
      duration?: number;
    };
  };
  specs?: {
    duration?: number;
    ageRating?: string;
    year?: number;
    countries?: string[];
  };
};

export function moviePosterUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/movieimg/${encodeURIComponent(file)}`;
}

export function movieTitle(movie: Movie) {
  return movie.title?.uz || movie.title?.ru || "Kino";
}

export async function fetchMovies(): Promise<Movie[]> {
  const response = await fetch(`${apiBaseUrl}/api/movies`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Kinolar yuklanmadi");
  }
  const body = (await response.json()) as { data?: Movie[] };
  return Array.isArray(body.data) ? body.data : [];
}
