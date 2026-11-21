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
import { useTelegramChrome } from "@/components/telegram/TelegramFullscreen";
import { useChatViewport } from '@/components/chat/useChatViewport';
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

const GUIDE_KEY = "moviy-chat-guide-understood";

function ChatScreen() {
  const { colors } = useTheme();
  const { messages, viewer, error, loading } = useChat();
  const t = useT();
  const [showGuide, setShowGuide] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [composerH, setComposerH] = useState(180);
  const dockRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { active: telegram, back } = useTelegramChrome();
  useChatViewport(mainRef, telegram);
  const topInset = telegram ? back + HEADER_ROW_HEIGHT : HEADER_ROW_HEIGHT;
  const hasMessages = loading || messages.length > 0 || Boolean(error);

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
    <main ref={mainRef} className="fixed flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.bg, height: 'var(--chat-viewport-height, 100%)', top: 'var(--chat-viewport-top, 0px)', left: 'var(--chat-viewport-left, 0px)', width: 'var(--chat-viewport-width, 100%)' }}>
      {hasMessages ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ChatMessageList topInset={topInset} bottomInset={viewer ? 24 : 16} followResize />
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 min-[384px]:px-3.5"
          style={{ paddingTop: topInset, paddingBottom: 16 }}
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
          className="relative z-20 shrink-0 px-3 motion-safe:transition-[padding-bottom] motion-safe:duration-150 motion-safe:ease-out"
          style={{ paddingBottom: 'var(--chat-composer-bottom, max(10px, env(safe-area-inset-bottom, 0px)))' }}
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
