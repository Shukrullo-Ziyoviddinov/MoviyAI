import { Suspense } from "react";
import { fetchBanners } from "@/api/banners";
import { fetchMovies, fetchTopSearchedMovies, fetchWeeklyTopSearchedMovies } from "@/api/movies";
import { HomeScreen } from "@/components/home/HomeScreen";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeScreen banners={null} movies={null} />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [bannerResult, movieResult, topResult, weeklyResult] = await Promise.allSettled([fetchBanners(), fetchMovies(), fetchTopSearchedMovies(), fetchWeeklyTopSearchedMovies()]);
  const banners = bannerResult.status === "fulfilled" ? bannerResult.value : [];
  const movies = movieResult.status === "fulfilled" ? movieResult.value : [];
  return <HomeScreen banners={banners} movies={movies} topSearched={topResult.status === 'fulfilled' ? topResult.value : []} weeklySearched={weeklyResult.status === 'fulfilled' ? weeklyResult.value : []} />;
}
