import { RecomendatPage } from '@/src/components/recommendations/RecomendatPage';
import { isMovieSection } from '@/src/api/movie-sections';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RecommendationScreen() {
  const { categoryName } = useLocalSearchParams<{ categoryName?: string | string[] }>();
  if (!isMovieSection(categoryName)) return <Redirect href="/home" />;
  return <RecomendatPage key={categoryName} categoryName={categoryName} />;
}
