"use client";

import { useEffect, useRef } from "react";
import { MediaGridBlock } from "@/components/chat/MediaGridBlock";
import { TextMessageBubble } from "@/components/chat/TextMessageBubble";
import { useChat } from "@/components/chat/chat-state";

export function ChatMessageList({ topInset, bottomInset }: { topInset: number; bottomInset: number }) {
  const { messages } = useChat();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [messages.length]);

  return (
    <div
      className="flex min-h-full flex-col justify-end"
      style={{ paddingTop: topInset + 8, paddingBottom: bottomInset }}
    >
      {messages.map((item) =>
        item.kind === "text" ? (
          <TextMessageBubble key={item.id} text={item.text} />
        ) : (
          <MediaGridBlock key={item.id} items={item.items} />
        )
      )}
      <div ref={endRef} />
    </div>
  );
}
