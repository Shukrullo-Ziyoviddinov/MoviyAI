"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-state";
import { LanguageModal } from "@/components/language/LanguageModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileMenuCard } from "@/components/profile/ProfileMenuCard";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

export default function ProfilePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, openAuthModal } = useAuth();
  const t = useT();

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "calc(var(--tg-chrome, 0px) + var(--tg-safe-pad, max(10px, env(safe-area-inset-top))))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <ProfileHeader
        name={profile?.name || t("auth.title")}
        email={profile?.email || t("auth.loginRequired")}
        picture={profile?.picture}
        onSettingsPress={() => router.push("/settings")}
        onProfilePress={() => {
          if (!profile) openAuthModal();
        }}
      />
      <div className="mt-7">
        <ProfileMenuCard
          onSavedMovies={() => router.push("/favorites")}
          onSettings={() => router.push("/settings")}
        />
      </div>
      <LanguageModal />
    </div>
  );
}
