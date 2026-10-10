import { BannerCardActions } from "@/components/banners/BannerCardActions";
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
    <ul className="grid gap-4 p-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
      {banners.map((banner) => {
        const linked = banner.movieId
          .map((id) => byId.get(id))
          .filter((movie): movie is Movie => Boolean(movie));
        return (
          <li key={banner.img} className="min-w-0">
            <article className="flex h-full items-end gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
              <div className="h-[180px] w-[120px] shrink-0 self-start overflow-hidden rounded-lg bg-[#101624]">
                <MoviePoster src={bannerImageUrl(banner.img)} alt="Banner" fit="contain" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2 self-start">
                {linked.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Kino topilmadi</p>
                ) : (
                  linked.map((movie) => {
                    const title = movieTitle(movie);
                    const genres = movie.genre?.uz?.filter(Boolean) ?? [];
                    return (
                      <div key={movie.id} className="flex min-w-0 items-start gap-2">
                        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-[#101624]">
                          <MoviePoster src={moviePosterUrl(movie.homeImgPoster)} alt={title} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <h2 className="text-sm font-semibold text-[#F3F4F6]">{title}</h2>
                          {genres.length > 0 ? (
                            <p className="text-sm text-[#6B7280]">{genres.join(", ")}</p>
                          ) : null}
                          <p className="flex flex-nowrap items-center gap-2 text-xs text-[#6B7280]">
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <img
                                src="/img/imdbnew.png"
                                alt=""
                                className="h-4 w-4 rounded object-cover"
                              />
                              IMDb {movie.ratingImdb ?? "—"}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <img
                                src="/img/kinopoisk.jpg"
                                alt=""
                                className="h-4 w-4 rounded object-cover"
                              />
                              Kinopoisk {movie.ratingKinopoisk ?? "—"}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <BannerCardActions banner={banner} />
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function BannerGridFallback() {
  return (
    <ul className="grid gap-4 p-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
      {Array.from({ length: 3 }, (_, index) => (
        <li
          key={index}
          className="flex gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3"
        >
          <div className="h-[180px] w-[120px] shrink-0 rounded-lg bg-[#101624]" />
          <div className="flex flex-1 items-center gap-3">
            <div className="h-20 w-14 rounded-lg bg-[#101624]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/3 rounded bg-[#101624]" />
              <div className="h-4 w-1/2 rounded bg-[#101624]" />
              <div className="h-4 w-3/4 rounded bg-[#101624]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
