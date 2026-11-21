"use client";

import { useState } from "react";
import { useChat } from "@/components/chat/chat-state";
import { SelectedMediaStrip } from "@/components/chat/SelectedMediaStrip";
import { CameraIcon, GalleryIcon, MicIcon, SendIcon, VideoIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

const mediaBtn = "flex h-9 w-9 items-center justify-center rounded-full border";

export function ChatComposer() {
  const { colors } = useTheme();
  const { stop,stopping,selectedMedia, removeMedia, send, pick, picking, sending, loading, error, deletingId, pinningId } = useChat();
  const t = useT();
  const [text, setText] = useState("");
  const canSend = !pinningId && !deletingId && !loading && !sending && !error && (!selectedMedia.some(item=>item.type==='video')||selectedMedia.length===1) && (text.trim().length > 0 || selectedMedia.length > 0);

  function handleSend() {
    if (!canSend) return;
    if (!send(text.trim() || t(selectedMedia.some(item=>item.type==='video')?'chat.videoPrompt':'chat.imagePrompt'))) return;
    setText("");
  }

  return (
    <div
      className="mx-auto w-full max-w-[430px] rounded-[28px] border-[1.5px] px-3 py-3 md:max-w-[720px]"
      style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}
    >
      {selectedMedia.length > 0 && <p className="text-xs" style={{ color: colors.textMuted }}>{t(selectedMedia.some(item => item.type === 'video') ? 'chat.videoLater' : 'chat.imageLimit')}</p>}
      <SelectedMediaStrip items={selectedMedia} onRemove={removeMedia} />
      <div className="flex items-end gap-2.5">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("chat.placeholder")}
          rows={1}
          maxLength={20000}
          className="max-h-[110px] min-h-12 flex-1 resize-none rounded-3xl border px-[18px] py-3 text-base outline-none md:text-[15px]"
          style={{
            backgroundColor: colors.panelSoft,
            borderColor: colors.borderSoft,
            color: colors.text,
          }}
        />
        <button
          type="button"
          aria-label={t(sending ? "chat.stop" : "chat.send")}
          onClick={() => { if(sending)void stop();else handleSend(); }}
          disabled={stopping || (!sending && !canSend)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.accent, opacity: (sending || canSend) && !stopping ? 1 : 0.45 }}
        >
          {sending ? <span aria-hidden="true" className="h-4 w-4 rounded-[3px]" style={{backgroundColor:colors.textOnAccent}} /> : <SendIcon size={18} color={colors.textOnAccent} />}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Rasm"
          onClick={() => pick("image")}
          className={mediaBtn}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, opacity: picking ? 0.5 : 1 }}
        >
          <GalleryIcon size={18} color={colors.icon} />
        </button>
        <button
          type="button"
          aria-label="Video"
          onClick={() => pick("video")}
          className={mediaBtn}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, opacity: picking ? 0.5 : 1 }}
        >
          <VideoIcon size={18} color={colors.icon} />
        </button>
        <button type="button" aria-label="Kamera" className={mediaBtn} style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
          <CameraIcon size={18} color={colors.icon} />
        </button>
        <button type="button" aria-label="Ovoz" className={mediaBtn} style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
          <MicIcon size={18} color={colors.icon} />
        </button>
      </div>
    </div>
  );
}
