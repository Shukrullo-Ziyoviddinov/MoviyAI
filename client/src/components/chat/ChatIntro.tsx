"use client";

import { useChat } from "@/components/chat/chat-state";
import { ChatBubbleIcon, GalleryIcon, StarIcon, VideoIcon } from "@/components/icons";
import { colors } from "@/constants/theme";

const actions = [
  { key: "text", label: "Matn bilan so'rov", Icon: ChatBubbleIcon },
  { key: "image", label: "Rasm bilan topish", Icon: GalleryIcon },
  { key: "video", label: "Video orqali topish", Icon: VideoIcon },
  { key: "recommend", label: "Tavsiya olish qidirish", Icon: StarIcon },
];

export function ChatIntro() {
  const { pick, picking } = useChat();

  return (
    <div className="flex w-full flex-col items-center px-1">
      <h1 className="text-center text-[26px] font-bold" style={{ color: colors.text }}>
        Qanday kino izlayapsiz?
      </h1>
      <p
        className="mt-2 px-3 text-center text-[16px] leading-6"
        style={{ color: colors.textMuted }}
      >
        Kino haqida yozing, rasm yuboring yoki video yuklang.
      </p>
      <div className="mt-[18px] grid w-full grid-cols-4 gap-2 md:gap-3">
        {actions.map(({ key, label, Icon }) => (
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
            <span className="[&_svg]:h-7 [&_svg]:w-7 md:[&_svg]:h-8 md:[&_svg]:w-8">
              <Icon size={28} color={colors.accentBright} />
            </span>
            <span
              className="text-center text-[13px] leading-4 font-semibold md:text-[15px] md:leading-5"
              style={{ color: colors.text }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
