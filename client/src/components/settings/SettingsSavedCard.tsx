"use client";

import { BookmarkIcon, ChatBubbleIcon } from "@/components/icons";
import { SettingsMenuRow } from "@/components/settings/SettingsMenuRow";
import { useTheme } from "@/components/theme/theme-state";

export function SettingsSavedCard({
  moviesCount = 0,
  onMovies,
}: {
  moviesCount?: number;
  onMovies?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <div className="mx-4 overflow-hidden rounded-[18px] border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <SettingsMenuRow
        title="Saqlangan kinolar"
        subtitle="Sevimli filmlaringiz ro'yxati"
        Icon={BookmarkIcon}
        value={String(moviesCount)}
        onPress={onMovies}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Saqlangan suhbatlar" subtitle="Oldingi AI suhbatlaringiz" Icon={ChatBubbleIcon} value="0" />
    </div>
  );
}
