"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWishlistIds } from "@/api/wishlist";
import { useAuth } from "@/components/auth/auth-state";
import { LanguageModal } from "@/components/language/LanguageModal";
import { SettingsGeneralCard } from "@/components/settings/SettingsGeneralCard";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { SettingsLogoutButton } from "@/components/settings/SettingsLogoutButton";
import { SettingsProfileCard } from "@/components/settings/SettingsProfileCard";
import { SettingsSavedCard } from "@/components/settings/SettingsSavedCard";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

export default function SettingsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, profile, openAuthModal, logout } = useAuth();
  const t = useT();
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
  }, [token]);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="mt-4">
        <SettingsProfileCard
          name={profile?.name || t("auth.title")}
          email={profile?.email || t("auth.loginRequired")}
          picture={profile?.picture}
          onPress={() => {
            if (profile) router.push("/profile");
            else openAuthModal();
          }}
        />
      </div>
      <div className="mt-4">
        <SettingsSavedCard
          moviesCount={moviesCount}
          onMovies={() => {
            if (profile) router.push("/favorites");
            else openAuthModal();
          }}
        />
      </div>
      <div className="mt-4">
        <SettingsGeneralCard
          onPrivacy={() => router.push("/privacy")}
          onData={() => router.push("/data-manage")}
          onAbout={() => router.push("/about")}
        />
      </div>
      <div className="mt-4">
        <SettingsLogoutButton onPress={logout} />
      </div>
      <LanguageModal />
    </div>
  );
}
