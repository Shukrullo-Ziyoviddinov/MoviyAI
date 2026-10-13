"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-state";
import { LanguageModal } from "@/components/language/LanguageModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileMenuCard } from "@/components/profile/ProfileMenuCard";
import { useTheme } from "@/components/theme/theme-state";

export default function ProfilePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, openAuthModal } = useAuth();

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <ProfileHeader
        name={profile?.name || "Google orqali kirish"}
        email={profile?.email || "Davom etish uchun Google orqali kiring"}
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
