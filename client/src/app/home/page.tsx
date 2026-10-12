"use client";

import { FloatingAiButton } from "@/components/home/FloatingAiButton";
import { HomeHeader } from "@/components/home/HomeHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { useTheme } from "@/components/theme/theme-state";

export default function HomePage() {
  const { colors } = useTheme();

  return (
    <main className="relative h-full" style={{ backgroundColor: colors.bg }}>
      <div
        className="absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      >
        <div className="flex h-11 items-center md:h-12">
          <HomeHeader />
        </div>
      </div>
      <FloatingAiButton />
      <BottomNav />
    </main>
  );
}
