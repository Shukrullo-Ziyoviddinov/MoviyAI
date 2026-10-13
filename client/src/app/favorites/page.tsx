"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWishlistMovies, toggleWishlistMovie, type WishlistMovie } from "@/api/wishlist";
import { useAuth } from "@/components/auth/auth-state";
import { ChatBubbleIcon, HeartIcon } from "@/components/icons";
import { FloatingAiButton } from "@/components/home/FloatingAiButton";
import { HomeHeader } from "@/components/home/HomeHeader";
import { useSideMenu } from "@/components/menu/SideMenu";
import { BottomNav } from "@/components/nav/BottomNav";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";
import { WishlistCard } from "@/components/wishlist/WishlistCard";

export default function FavoritesPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { token } = useAuth();
  const { desktopOpen } = useSideMenu();
  const t = useT();
  const [movies, setMovies] = useState<WishlistMovie[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWishlistMovies()
      .then((next) => {
        if (alive) setMovies(next);
      })
      .catch(() => {
        if (alive) setMovies([]);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const columns = desktopOpen ? "md:grid-cols-5" : "md:grid-cols-7";

  async function onToggleSave(movieId: number) {
    const previous = movies;
    setMovies((list) => list?.filter((item) => item.id !== movieId) ?? list);
    try {
      const result = await toggleWishlistMovie(movieId);
      if (result.saved) setMovies(previous);
    } catch {
      setMovies(previous);
    }
  }

  return (
    <main className="relative h-full min-h-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
      {movies === null ? (
        <div className="h-full" />
      ) : movies.length > 0 ? (
        <div className="no-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-4 pt-[max(64px,calc(env(safe-area-inset-top)+64px))] pb-[max(94px,calc(80px+env(safe-area-inset-bottom)))] md:pb-6">
          <div className={`grid content-start grid-cols-2 gap-x-3 gap-y-3.5 md:gap-x-2.5 md:gap-y-3 ${columns}`}>
            {movies.map((movie) => (
              <WishlistCard key={movie.id} movie={movie} onToggleSave={(id) => void onToggleSave(id)} />
            ))}
          </div>
        </div>
      ) : (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div
          className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] border"
          style={{
            backgroundColor: isDark ? "rgba(244, 114, 182, 0.14)" : "rgba(244, 114, 182, 0.1)",
            borderColor: colors.borderSoft,
          }}
        >
          <HeartIcon size={44} color="#F472B6" />
        </div>
        <p className="text-center text-[20px] font-bold" style={{ color: colors.text }}>
          {t("favorites.emptyTitle")}
        </p>
        <p className="mt-2 max-w-[300px] text-center text-[14px] leading-5" style={{ color: colors.textMuted }}>
          {t("favorites.emptySubtitle")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-[22px] flex items-center gap-2 rounded-[14px] px-5 py-[13px]"
          style={{ backgroundColor: colors.accent }}
        >
          <ChatBubbleIcon size={18} color={colors.textOnAccent} />
          <span className="text-[15px] font-bold" style={{ color: colors.textOnAccent }}>
            {t("favorites.goToChat")}
          </span>
        </button>
      </div>
      )}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto flex h-11 items-center">
          <HomeHeader />
        </div>
      </div>
      <FloatingAiButton />
      <BottomNav />
    </main>
  );
}
