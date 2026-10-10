import { MoviePoster } from "@/components/movies/MoviePoster";
import {
  bannerImageUrl,
  fetchBanners,
  fetchMovies,
  moviePosterUrl,
  movieTitle,
  type Movie,
} from "@/lib/movies";

export async function BannerGrid() {
  let banners: Awaited<ReturnType<typeof fetchBanners>> = [];
  let movies: Movie[] = [];
  try {
    [banners, movies] = await Promise.all([fetchBanners(), fetchMovies()]);
  } catch {
    return <p className="p-6 text-sm text-[#6B7280]">Bannerlar yuklanmadi</p>;
  }

  if (banners.length === 0) {
    return <p className="p-6 text-sm text-[#6B7280]">Bannerlar topilmadi</p>;
  }

  const byId = new Map(movies.map((movie) => [movie.id, movie]));

  return (
    <ul className="flex flex-col gap-4 p-6">
      {banners.map((banner) => {
        const linked = banner.movieId
          .map((id) => byId.get(id))
          .filter((movie): movie is Movie => Boolean(movie));
        return (
          <li key={banner.img}>
            <article className="flex flex-col gap-4 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3 sm:flex-row sm:items-center">
              <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-[#101624] sm:w-72">
                <MoviePoster src={bannerImageUrl(banner.img)} alt="Banner" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {linked.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Kino topilmadi</p>
                ) : (
                  linked.map((movie) => {
                    const title = movieTitle(movie);
                    return (
                      <div key={movie.id} className="flex items-center gap-3">
                        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[#101624]">
                          <MoviePoster src={moviePosterUrl(movie.homeImgPoster)} alt={title} />
                        </div>
                        <h2 className="min-w-0 text-base font-semibold text-[#F3F4F6]">{title}</h2>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function BannerGridFallback() {
  return (
    <ul className="flex flex-col gap-4 p-6">
      {Array.from({ length: 3 }, (_, index) => (
        <li
          key={index}
          className="flex gap-4 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3"
        >
          <div className="h-40 w-72 shrink-0 rounded-lg bg-[#101624]" />
          <div className="flex items-center gap-3">
            <div className="h-24 w-16 rounded-lg bg-[#101624]" />
            <div className="h-5 w-40 rounded bg-[#101624]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
