"use client";

import { EditMovieButton } from "@/components/movies/EditMovieButton";
import { MovieAbout } from "@/components/movies/MovieAbout";
import { MoviePoster } from "@/components/movies/MoviePoster";
import { matchesQuery, usePageSearch } from "@/components/search/page-search";
import { moviePosterUrl, movieTitle, type Movie } from "@/lib/movies";

function movieFacts(movie: Movie) {
  const year = movie.specs?.year;
  const duration = movie.specs?.duration;
  const age = movie.specs?.ageRating;
  const country =
    movie.specs?.countries?.filter(Boolean).join(", ") ||
    movie.description?.uz?.country;
  return [
    year ? String(year) : "",
    duration ? `${duration} daqiqa` : "",
    age ?? "",
    country ?? "",
  ].filter(Boolean);
}

export function MovieCards({ movies }: { movies: Movie[] }) {
  const { query } = usePageSearch();
  const visible = movies.filter((movie) =>
    matchesQuery(query, [
      movie.title?.uz,
      movie.title?.ru,
      movie.categoryName,
      movie.filterCountry,
      ...(movie.filterGenre ?? []),
      ...(movie.genre?.uz ?? []),
      ...(movie.genre?.ru ?? []),
      movie.description?.uz?.text,
      movie.description?.ru?.text,
      movie.description?.uz?.director,
      movie.description?.ru?.director,
      movie.description?.uz?.country,
      movie.description?.ru?.country,
      movie.specs?.year,
      movie.specs?.ageRating,
      ...(movie.specs?.countries ?? []),
    ]),
  );

  if (visible.length === 0) {
    return <p className="p-6 text-sm text-[#6B7280]">Qidiruv bo‘yicha kino topilmadi</p>;
  }

  return (
    <ul className="grid gap-4 p-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,36rem),1fr))]">
      {visible.map((movie) => {
        const title = movieTitle(movie);
        const facts = movieFacts(movie);
        const genres = movie.genre?.uz?.filter(Boolean) ?? [];
        const about = movie.description?.uz;
        const director = about?.director;
        return (
          <li key={movie.id} className="@container min-w-0">
            <article className="flex h-full flex-col gap-4 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3 @[32rem]:flex-row">
              <div className="h-56 w-40 shrink-0 overflow-hidden rounded-lg bg-[#101624]">
                <MoviePoster src={moviePosterUrl(movie.homeImgPoster)} alt={title} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h2 className="text-base font-semibold text-[#F3F4F6]">{title}</h2>
                {facts.length > 0 ? (
                  <p className="text-sm text-[#6B7280]">{facts.join(" · ")}</p>
                ) : null}
                {genres.length > 0 ? (
                  <p className="text-sm text-[#F3F4F6]">{genres.join(", ")}</p>
                ) : null}
                {director ? (
                  <p className="text-sm text-[#6B7280]">Rejissyor: {director}</p>
                ) : null}
                <MovieAbout
                  text={about?.text}
                  year={about?.year ?? movie.specs?.year}
                  country={
                    about?.country ||
                    movie.specs?.countries?.filter(Boolean).join(", ")
                  }
                  duration={about?.duration ?? movie.specs?.duration}
                  director={director}
                />
                <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <img
                      src="/img/imdbnew.png"
                      alt=""
                      className="h-5 w-5 rounded object-cover"
                    />
                    IMDb {movie.ratingImdb ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <img
                      src="/img/kinopoisk.jpg"
                      alt=""
                      className="h-5 w-5 rounded object-cover"
                    />
                    Kinopoisk {movie.ratingKinopoisk ?? "—"}
                  </span>
                  <EditMovieButton movie={movie} />
                </p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
