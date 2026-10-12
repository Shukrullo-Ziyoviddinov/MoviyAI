"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWishlistMovies, type WishlistMovie } from "@/api/wishlist";
import { ChatBubbleIcon, HeartIcon } from "@/components/icons";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useTheme } from "@/components/theme/theme-state";
import { FloatingAiButton } from "@/components/home/FloatingAiButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { WishlistCard } from "@/components/wishlist/WishlistCard";

export default function FavoritesPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
  }, []);

  return (
    <div
      className="relative flex h-full flex-col"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(94px, calc(80px + env(safe-area-inset-bottom)))",
      }}
    >
      <SettingsHeader title="Sevimli" />
      {movies === null ? (
        <div className="flex-1" />
      ) : movies.length > 0 ? (
        <div className="no-scrollbar grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-3.5 overflow-y-auto px-4 pt-2.5">
          {movies.map((movie) => (
            <WishlistCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
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
          Sevimlilar bo‘sh
        </p>
        <p className="mt-2 max-w-[300px] text-center text-[14px] leading-5" style={{ color: colors.textMuted }}>
          O‘z sevimli kino filmlaringizni AI Chat orqali qidiring va sevimli kino filmlarni saqlang.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-[22px] flex items-center gap-2 rounded-[14px] px-5 py-[13px]"
          style={{ backgroundColor: colors.accent }}
        >
          <ChatBubbleIcon size={18} color={colors.textOnAccent} />
          <span className="text-[15px] font-bold" style={{ color: colors.textOnAccent }}>
            AI Chatga o‘tish
          </span>
        </button>
      </div>
      )}
      <FloatingAiButton />
      <BottomNav />
    </div>
  );
}
