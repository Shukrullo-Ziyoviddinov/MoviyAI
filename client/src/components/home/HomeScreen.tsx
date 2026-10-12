"use client";

import type { Banner } from "@/api/banners";
import type { HomeMovie } from "@/api/movies";
import { FloatingAiButton } from "@/components/home/FloatingAiButton";
import { HomeBanner } from "@/components/home/HomeBanner";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeMovies } from "@/components/home/HomeMovies";
import { BottomNav } from "@/components/nav/BottomNav";
import { useTheme } from "@/components/theme/theme-state";

export function HomeScreen({ banners, movies }: { banners: Banner[] | null; movies: HomeMovie[] | null }) {
  const { colors } = useTheme();

  return (
    <main className="relative h-full" style={{ backgroundColor: colors.bg }}>
      <div className="@container no-scrollbar h-full overflow-y-auto pb-[max(94px,calc(80px+env(safe-area-inset-bottom)))] md:pb-6">
        <HomeBanner banners={banners} />
        <HomeMovies movies={movies} />
      </div>
      <div
        className="absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      >
        <div className="flex h-11 items-center">
          <HomeHeader />
        </div>
      </div>
      <FloatingAiButton />
      <BottomNav />
    </main>
  );
}
