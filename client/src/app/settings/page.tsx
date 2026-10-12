"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWishlistIds } from "@/api/wishlist";
import { LanguageModal } from "@/components/language/LanguageModal";
import { SettingsGeneralCard } from "@/components/settings/SettingsGeneralCard";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { SettingsLogoutButton } from "@/components/settings/SettingsLogoutButton";
import { SettingsProfileCard } from "@/components/settings/SettingsProfileCard";
import { SettingsSavedCard } from "@/components/settings/SettingsSavedCard";
import { useTheme } from "@/components/theme/theme-state";

export default function SettingsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [moviesCount, setMoviesCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchWishlistIds()
      .then((ids) => {
        if (alive) setMoviesCount(ids.length);
      })
      .catch(() => {
        if (alive) setMoviesCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title="Sozlamalar" subtitle="Ilovangizni o'zingizga moslab sozlang" />
      <div className="mt-4">
        <SettingsProfileCard
          name="Google orqali kirish"
          email="Davom etish uchun Google orqali kiring"
          onPress={() => router.push("/profile")}
        />
      </div>
      <div className="mt-4">
        <SettingsSavedCard moviesCount={moviesCount} onMovies={() => router.push("/favorites")} />
      </div>
      <div className="mt-4">
        <SettingsGeneralCard
          onPrivacy={() => router.push("/privacy")}
          onData={() => router.push("/data-manage")}
          onAbout={() => router.push("/about")}
        />
      </div>
      <div className="mt-4">
        <SettingsLogoutButton />
      </div>
      <LanguageModal />
    </div>
  );
}
