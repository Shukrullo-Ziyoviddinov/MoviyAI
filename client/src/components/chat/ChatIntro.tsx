"use client";

import { useChat } from "@/components/chat/chat-state";
import { ChatBubbleIcon, GalleryIcon, StarIcon, VideoIcon } from "@/components/icons";
import { colors } from "@/constants/theme";
import { useT } from "@/i18n/useT";

const actions = [
  { key: "text", labelKey: "chat.actionText", Icon: ChatBubbleIcon },
  { key: "image", labelKey: "chat.actionImage", Icon: GalleryIcon },
  { key: "video", labelKey: "chat.actionVideo", Icon: VideoIcon },
  { key: "recommend", labelKey: "chat.actionRecommend", Icon: StarIcon },
];

export function ChatIntro() {
  const { pick, picking } = useChat();
  const t = useT();

  return (
    <div className="flex w-full flex-col items-center px-1">
      <h1 className="text-center text-[22px] font-bold min-[384px]:text-[26px]" style={{ color: colors.text }}>
        {t("chat.introTitle")}
      </h1>
      <p
        className="mt-2 px-1 text-center text-[14px] leading-5 min-[384px]:px-3 min-[384px]:text-[16px] min-[384px]:leading-6"
        style={{ color: colors.textMuted }}
      >
        {t("chat.introSubtitle")}
      </p>
      <div className="mt-[18px] grid w-full grid-cols-4 gap-2">
        {actions.map(({ key, labelKey, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === "image") pick("image");
              if (key === "video") pick("video");
            }}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3"
            style={{
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
              opacity: picking && (key === "image" || key === "video") ? 0.5 : 1,
            }}
          >
            <Icon size={22} color={colors.accentBright} />
            <span className="text-center text-[10px] leading-[13px] font-semibold" style={{ color: colors.text }}>
              {t(labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
