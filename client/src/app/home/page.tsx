import { Suspense } from "react";
import { fetchBanners } from "@/api/banners";
import { fetchTopSearchedMovies, fetchWeeklyTopSearchedMovies } from "@/api/movies";
import { fetchHomeSections } from '@/api/movie-sections';
import { HomeScreen } from "@/components/home/HomeScreen";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeScreen banners={null} movies={null} />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [bannerResult, movieResult, topResult, weeklyResult] = await Promise.allSettled([fetchBanners(), fetchHomeSections(), fetchTopSearchedMovies(), fetchWeeklyTopSearchedMovies()]);
  const banners = bannerResult.status === "fulfilled" ? bannerResult.value : [];
  const movies = movieResult.status === "fulfilled" ? movieResult.value.flatMap(section => section.movies) : [];
  return <HomeScreen banners={banners} movies={movies} moviesError={movieResult.status === 'rejected'} topSearched={topResult.status === 'fulfilled' ? topResult.value : []} weeklySearched={weeklyResult.status === 'fulfilled' ? weeklyResult.value : []} />;
}
