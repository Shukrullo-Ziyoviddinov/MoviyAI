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
    <div className="flex w-full flex-col items-center px-0 min-[384px]:px-1">
      <h1 className="text-center text-[22px] font-bold min-[384px]:text-[26px]" style={{ color: colors.text }}>
        Qanday kino izlayapsiz?
      </h1>
      <p
        className="mt-2 px-1 text-center text-[14px] leading-5 min-[384px]:px-3 min-[384px]:text-[16px] min-[384px]:leading-6"
        style={{ color: colors.textMuted }}
      >
        Kino haqida yozing, rasm yuboring yoki video yuklang.
      </p>
      <div className="mt-3.5 grid w-full max-w-[400px] grid-cols-4 gap-1 min-[384px]:mt-[18px] min-[384px]:gap-2 md:max-w-[520px] md:gap-3">
        {actions.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === "image") pick("image");
              if (key === "video") pick("video");
            }}
            className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 min-[384px]:min-h-[88px] min-[384px]:gap-2 min-[384px]:rounded-2xl min-[384px]:px-1.5 min-[384px]:py-3"
            style={{
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
              opacity: picking && (key === "image" || key === "video") ? 0.5 : 1,
            }}
          >
            <span className="[&_svg]:h-5 [&_svg]:w-5 min-[384px]:[&_svg]:h-6 min-[384px]:[&_svg]:w-6 md:[&_svg]:h-7 md:[&_svg]:w-7">
              <Icon size={20} color={colors.accentBright} />
            </span>
            <span
              className="flex min-h-9 w-full items-start justify-center text-center text-[10px] leading-3 font-semibold min-[384px]:min-h-8 min-[384px]:text-[12px] min-[384px]:leading-4 md:min-h-9 md:text-[13px] md:leading-[18px]"
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
