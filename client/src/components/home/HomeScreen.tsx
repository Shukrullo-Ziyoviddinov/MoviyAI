"use client";

import type { Banner } from "@/api/banners";
import type { HomeMovie } from "@/api/movies";
import { FloatingAiButton } from "@/components/home/FloatingAiButton";
import { HomeBanner } from "@/components/home/HomeBanner";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeMovies } from "@/components/home/HomeMovies";
import { BottomNav } from "@/components/nav/BottomNav";
import { useTelegramChrome } from "@/components/telegram/TelegramFullscreen";
import { useTheme } from "@/components/theme/theme-state";

export function HomeScreen({ banners, movies }: { banners: Banner[] | null; movies: HomeMovie[] | null }) {
  const { colors } = useTheme();
  const { active } = useTelegramChrome();

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
        className="absolute inset-x-0 z-40 px-4"
        style={
          active
            ? { top: "var(--tg-chrome, 0px)" }
            : { top: 0, paddingTop: "max(10px, env(safe-area-inset-top))" }
        }
      >
        {active ? (
          <div className="flex h-[62px] items-center">
            <HomeHeader />
          </div>
        ) : (
          <HomeHeader />
        )}
      </div>
      <FloatingAiButton />
      <BottomNav />
    </main>
  );
}
