"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/theme-state";

export function UserAvatar({
  name = "",
  picture,
  size = 40,
}: {
  name?: string;
  picture?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const photo = picture?.trim() || "";
  const [failed, setFailed] = useState(false);
  const letter = (name.trim().charAt(0) || "?").toUpperCase();

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden border"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.panelSoft,
        borderColor: colors.borderSoft,
      }}
    >
      {photo && !failed ? (
        <img src={photo} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="font-bold" style={{ color: colors.text, fontSize: size * 0.42 }}>
          {letter}
        </span>
      )}
    </span>
  );
}
