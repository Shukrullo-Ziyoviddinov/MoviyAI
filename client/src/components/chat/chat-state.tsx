"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { ChatMediaItem, ChatMessage } from "@/types/chat";

type ChatContextValue = {
  messages: ChatMessage[];
  selectedMedia: ChatMediaItem[];
  picking: boolean;
  viewer: ChatMediaItem | null;
  pick: (type: "image" | "video") => void;
  removeMedia: (id: string) => void;
  send: (text: string) => void;
  openViewer: (item: ChatMediaItem) => void;
  closeViewer: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function measureFile(type: "image" | "video", uri: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    if (type === "image") {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: 0, height: 0 });
      image.src = uri;
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = uri;
  });
}

function chunkMedia(items: ChatMediaItem[], size = 4) {
  const chunks: ChatMediaItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<ChatMediaItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [viewer, setViewer] = useState<ChatMediaItem | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pickType = useRef<"image" | "video">("image");

  function pick(type: "image" | "video") {
    pickType.current = type;
    const input = type === "image" ? imageRef.current : videoRef.current;
    if (!input) return;
    setPicking(true);
    input.addEventListener("cancel", () => setPicking(false), { once: true });
    input.click();
  }

  function onFiles(files: FileList | null) {
    const type = pickType.current;
    setPicking(false);
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    void Promise.all(
      picked.map(async (file, index) => {
        const uri = URL.createObjectURL(file);
        const size = await measureFile(type, uri);
        return {
          id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
          uri,
          type,
          width: size.width || undefined,
          height: size.height || undefined,
        };
      })
    ).then((next) => {
      setSelectedMedia((current) => {
        const existing = new Set(current.map((item) => item.uri));
        return [...current, ...next.filter((item) => !existing.has(item.uri))];
      });
    });
  }

  function removeMedia(id: string) {
    setSelectedMedia((current) => current.filter((item) => item.id !== id));
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed && selectedMedia.length === 0) return;
    const now = Date.now();
    const next: ChatMessage[] = [];
    chunkMedia(selectedMedia, 4).forEach((items, index) => {
      next.push({
        id: `media-${now}-${index}`,
        kind: "media",
        items,
        createdAt: now + index,
      });
    });
    if (trimmed) {
      next.push({
        id: `text-${now}`,
        kind: "text",
        text: trimmed,
        createdAt: now + selectedMedia.length + 1,
      });
    }
    setMessages((current) => [...current, ...next]);
    setSelectedMedia([]);
  }

  function openViewer(item: ChatMediaItem) {
    setViewer(item);
  }

  function closeViewer() {
    setViewer(null);
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        selectedMedia,
        picking,
        viewer,
        pick,
        removeMedia,
        send,
        openViewer,
        closeViewer,
      }}
    >
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used within ChatProvider");
  return value;
}
