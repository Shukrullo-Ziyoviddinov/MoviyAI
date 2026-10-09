import { Suspense } from "react";
import { MovieGrid, MovieGridFallback } from "@/components/movies/MovieGrid";

export default function MoviesPage() {
  return (
    <Suspense fallback={<MovieGridFallback />}>
      <MovieGrid />
    </Suspense>
  );
}
