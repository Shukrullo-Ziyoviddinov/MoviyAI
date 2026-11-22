import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isMovieSection } from '@/api/movie-sections';
import { RecomendatPage } from '@/components/recommendations/RecomendatPage';
import { MovieCardSkeleton } from '@/components/home/MovieCard';

export default function RecommendationsPage({ params }: { params: Promise<{ categoryName: string }> }) {
  return <Suspense fallback={<div className="grid h-full grid-cols-2 content-start gap-3 overflow-hidden p-4 pt-24 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 12 }, (_, i) => <MovieCardSkeleton key={i} grid />)}</div>}>
    <SectionContent params={params} />
  </Suspense>;
}
async function SectionContent({ params }: { params: Promise<{ categoryName: string }> }) {
  const { categoryName } = await params;
  if (!isMovieSection(categoryName)) notFound();
  return <RecomendatPage key={categoryName} category={categoryName} />;
}
