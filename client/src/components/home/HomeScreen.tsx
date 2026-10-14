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
      <div
        className="@container no-scrollbar overflow-y-auto pb-[max(94px,calc(80px+env(safe-area-inset-bottom)))] md:pb-6"
        style={{ marginTop: "var(--tg-chrome)", height: "calc(100% - var(--tg-chrome))" }}
      >
        <HomeBanner banners={banners} />
        <HomeMovies movies={movies} />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 z-40 max-md:fixed"
        style={{
          top: "var(--tg-chrome, 0px)",
          paddingTop: "var(--tg-home-pad, max(10px, env(safe-area-inset-top)))",
        }}
      >
        <div className="pointer-events-auto flex items-center px-4" style={{ height: "var(--tg-home-row, auto)" }}>
          <HomeHeader />
        </div>
      </div>
      <FloatingAiButton />
      <BottomNav />
    </main>
  );
}
