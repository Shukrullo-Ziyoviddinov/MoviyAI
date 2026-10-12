"use client";

import { SettingsIcon } from "@/components/icons";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useTheme } from "@/components/theme/theme-state";

export function ProfileHeader({
  name,
  email,
  picture,
  onSettingsPress,
  onProfilePress,
}: {
  name: string;
  email: string;
  picture?: string | null;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const logo = isDark ? "/images/MY_preview_rev_1.png" : "/images/qoralogo_preview_rev_1.png";

  return (
    <div className="px-[18px]">
      <div className="mb-[22px] flex items-center justify-between">
        <img src={logo} alt="" className="h-9 w-9 object-contain" />
        <button
          type="button"
          aria-label="Sozlamalar"
          onClick={onSettingsPress}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
        >
          <SettingsIcon size={20} color={colors.icon} />
        </button>
      </div>
      <button type="button" onClick={onProfilePress} className="flex w-full items-center gap-3.5 text-left">
        <UserAvatar name={name} picture={picture} size={72} />
        <span className="min-w-0 flex-1">
          <span className="block text-[22px] font-bold" style={{ color: colors.text }}>
            {name}
          </span>
          <span className="mt-1 block text-[14px]" style={{ color: colors.textMuted }}>
            {email}
          </span>
        </span>
      </button>
    </div>
  );
}
