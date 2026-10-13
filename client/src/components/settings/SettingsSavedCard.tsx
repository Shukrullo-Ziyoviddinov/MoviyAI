"use client";

import { BookmarkIcon, ChatBubbleIcon } from "@/components/icons";
import { SettingsMenuRow } from "@/components/settings/SettingsMenuRow";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

export function SettingsSavedCard({
  moviesCount = 0,
  onMovies,
}: {
  moviesCount?: number;
  onMovies?: () => void;
}) {
  const { colors } = useTheme();
  const t = useT();

  return (
    <div className="mx-4 overflow-hidden rounded-[18px] border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <SettingsMenuRow
        title={t("settings.savedMovies")}
        subtitle={t("settings.savedMoviesSub")}
        Icon={BookmarkIcon}
        value={String(moviesCount)}
        onPress={onMovies}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("settings.savedChats")} subtitle={t("settings.savedChatsSub")} Icon={ChatBubbleIcon} value="0" />
    </div>
  );
}
