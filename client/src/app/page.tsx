"use client";

import { useEffect, useRef, useState } from "react";
import { dismissChatGuide } from "@/api/auth";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader, HEADER_ROW_HEIGHT } from "@/components/chat/ChatHeader";
import { ChatIntro } from "@/components/chat/ChatIntro";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { useChat } from "@/components/chat/chat-state";
import { MediaViewer } from "@/components/chat/MediaViewer";
import { VideoModal } from "@/components/chat/VideoModal";
import { GuideSmsBubble } from "@/components/common/GuideSmsBubble";
import { colors } from "@/constants/theme";
import { useT } from "@/i18n/useT";

const GUIDE_KEY = "moviy-chat-guide-understood";

function ChatScreen() {
  const { messages, viewer } = useChat();
  const t = useT();
  const [showGuide, setShowGuide] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [composerH, setComposerH] = useState(180);
  const dockRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    const understood = window.localStorage.getItem(GUIDE_KEY) === "1";
    const timer = window.setTimeout(() => {
      setShowGuide(!understood);
      setGuideReady(true);
    }, understood ? 0 : 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const watch = new ResizeObserver(() => setComposerH(dock.offsetHeight));
    watch.observe(dock);
    setComposerH(dock.offsetHeight);
    return () => watch.disconnect();
  }, [viewer]);

  async function onGotIt() {
    setShowGuide(false);
    window.localStorage.setItem(GUIDE_KEY, "1");
    try {
      await dismissChatGuide();
    } catch {
      // local flag is already saved
    }
  }

  return (
    <main className="relative flex h-dvh w-full flex-col" style={{ backgroundColor: colors.bg }}>
      {hasMessages ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatMessageList topInset={HEADER_ROW_HEIGHT} bottomInset={viewer ? 24 : composerH} />
        </div>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center px-2 min-[384px]:px-3.5"
          style={{ paddingTop: HEADER_ROW_HEIGHT, paddingBottom: composerH }}
        >
          <img
            src="/images/ai_preview_rev_1.png"
            alt=""
            className="h-[min(42vw,180px)] w-[min(42vw,180px)] object-contain"
          />
          <div className="mt-3 w-full max-w-[430px] md:max-w-[560px]">
            <ChatIntro />
          </div>
        </div>
      )}

      <ChatHeader />
      <MediaViewer />
      <VideoModal />

      {viewer ? null : (
        <div
          ref={dockRef}
          className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
        >
          <ChatComposer />
        </div>
      )}

      {!viewer && guideReady && showGuide ? (
        <div className="pointer-events-none absolute inset-x-0 z-30 px-3" style={{ bottom: composerH }}>
          <GuideSmsBubble text={t("chat.guideText")} gotItLabel={t("chat.guideGotIt")} onGotIt={onGotIt} />
        </div>
      ) : null}
    </main>
  );
}

export default function ChatPage() {
  return <ChatScreen />;
}
