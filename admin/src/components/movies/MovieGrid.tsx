import { MovieCards } from "@/components/movies/MovieCards";
import { fetchMovies, type Movie } from "@/lib/movies";

export async function MovieGrid() {
  let movies: Movie[] = [];
  try {
    movies = await fetchMovies();
  } catch {
    return <p className="p-6 text-sm text-[#6B7280]">Kinolar yuklanmadi</p>;
  }

  if (movies.length === 0) {
    return <p className="p-6 text-sm text-[#6B7280]">Kinolar topilmadi</p>;
  }

  return <MovieCards movies={movies} />;
}

export function MovieGridFallback() {
  return (
    <ul className="grid gap-4 p-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,36rem),1fr))]">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex gap-4 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
          <div className="h-56 w-40 shrink-0 rounded-lg bg-[#101624]" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-5 w-2/3 rounded bg-[#101624]" />
            <div className="h-4 w-1/2 rounded bg-[#101624]" />
            <div className="h-4 w-full rounded bg-[#101624]" />
            <div className="h-4 w-5/6 rounded bg-[#101624]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
