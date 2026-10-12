import { Suspense } from "react";
import { fetchBanners, type Banner } from "@/api/banners";
import { fetchMovies, type HomeMovie } from "@/api/movies";
import { HomeScreen } from "@/components/home/HomeScreen";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeScreen banners={null} movies={null} />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  let banners: Banner[] = [];
  let movies: HomeMovie[] = [];
  try {
    banners = await fetchBanners();
  } catch {
    banners = [];
  }
  try {
    movies = await fetchMovies();
  } catch {
    movies = [];
  }
  return <HomeScreen banners={banners} movies={movies} />;
}
