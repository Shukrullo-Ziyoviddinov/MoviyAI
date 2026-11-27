import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { fetchMovies } from "@/api/movies";
import { moviePath, siteOrigin } from "@/utils/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = siteOrigin();

  const movies = await fetchMovies();
  const ids = new Set(movies.map(({ id }) => id).filter((id) => Number.isSafeInteger(id) && id > 0));
  return [
    { url: `${origin}/` },
    { url: `${origin}/home` },
    ...Array.from(ids, (id) => ({ url: `${origin}${moviePath(id)}` })),
  ];
}
