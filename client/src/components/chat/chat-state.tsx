"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ChatMediaItem, ChatMessage } from "@/types/chat";
import { createChatSession } from '@/stores/chat-session';
import { webChatStorage } from '@/stores/web-chat-storage';
import type { ChatSummary } from '@/api/chat';
import { useAuth } from '@/components/auth/auth-state';

type ChatContextValue = {
  refreshMedia: () => Promise<void>;
  pinningId: string | null;
  pinError: string | null;
  setPinned: (id: string, pinned: boolean) => Promise<boolean>;
  deletingId: string | null;
  deleteError: string | null;
  deleteConversation: (id: string) => Promise<boolean>;
  streamingText: string;
  conversations: ChatSummary[];
  activeId: string | null;
  loading: boolean;
  listLoading: boolean;
  openChat: (id: string) => Promise<void>;
  newChat: () => void;
  sending: boolean;
  error: string | null;
  retry: () => void;
  messages: ChatMessage[];
  selectedMedia: ChatMediaItem[];
  picking: boolean;
  viewer: ChatMediaItem | null;
  pick: (type: "image" | "video") => void;
  removeMedia: (id: string) => void;
  send: (text: string) => boolean;
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

export function ChatProvider({ children }: { children: ReactNode }) {
  const { profile, ready } = useAuth();
  const [session] = useState(() => createChatSession(webChatStorage));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { messages, sending, loading, error, conversations, activeId, streamingText, deletingId, deleteError, pinningId, pinError, listLoading } = snapshot;
  const { refreshMedia, retry, openChat, newChat, deleteConversation, setPinned } = session.actions;
  const owner = ready ? profile?.id ?? null : null;
  useEffect(() => { void session.actions.initialize(owner); }, [session, owner]);
  useEffect(() => {
    const onReturn = (event: PageTransitionEvent) => {
      if (!event.persisted || !owner) return;
      // A browser back/forward cache return is a new visit, even after a reload.
      try { window.sessionStorage.removeItem(`moviy.activeChat.${owner}`); } catch { /* Storage can be disabled. */ }
      void session.actions.initialize(owner);
    };
    window.addEventListener('pageshow', onReturn);
    return () => window.removeEventListener('pageshow', onReturn);
  }, [owner, session]);
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
          file, mimeType: file.type, fileName: file.name, fileSize: file.size,
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
    const sent = session.actions.sendMessage({text,media:selectedMedia});
    if (sent) setSelectedMedia([]);
    return sent;
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
        refreshMedia,
        pinningId,
        pinError,
        setPinned,
        deletingId,
        deleteError,
        deleteConversation,
        streamingText,
        conversations,
        activeId,
        loading,
        listLoading,
        openChat: async id => { setSelectedMedia([]); setViewer(null); await openChat(id); },
        newChat: () => { newChat(); setSelectedMedia([]); setViewer(null); },
        sending,
        error,
        retry,
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
