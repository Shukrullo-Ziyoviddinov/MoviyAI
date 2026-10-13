"use client";

import { useTheme } from "@/components/theme/theme-state";
import { useMobileBackClose } from "@/components/common/useMobileBackClose";
import { CloseIcon } from "@/components/icons";
import { SHEET_CLOSE_MS, SHEET_EASE, SHEET_OPEN_MS, useSheetMotion } from "@/components/movie/useSheetMotion";

export function ActorInfoModal({
  open,
  onClose,
  name,
  aboutText,
  aboutTitle,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  aboutText: string;
  aboutTitle: string;
}) {
  const { colors } = useTheme();
  const sheet = useSheetMotion(open, onClose);
  useMobileBackClose(open && !sheet.desktop, onClose);
  if (!sheet.mounted || !name) return null;

  const motion =
    sheet.dragging || !sheet.ready
      ? "none"
      : `transform ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}, opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`;

  return (
    <div className={`absolute inset-0 z-50 flex ${sheet.desktop ? "items-center justify-center p-6" : "items-end"}`}>
      <button
        type="button"
        aria-label="Yopish"
        ref={sheet.bindBackdrop}
        className="absolute inset-0 border-0 bg-black"
        style={{
          opacity: sheet.backdrop,
          transition: sheet.dragging || !sheet.ready ? "none" : `opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`,
        }}
        onClick={onClose}
      />
      <div
        ref={sheet.bindSheet}
        className={
          sheet.desktop
            ? "relative flex max-h-[72vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border"
            : "relative flex h-[min(72dvh,calc(100dvh-24px))] w-full flex-col overflow-hidden rounded-t-[22px] border-t"
        }
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
          transform: sheet.transform,
          opacity: sheet.desktop ? (sheet.shown ? 1 : 0) : 1,
          transition: motion,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {sheet.desktop ? (
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
            <div className="min-w-0 px-1">
              <h2 className="text-[18px] leading-6 font-bold" style={{ color: colors.text }}>
                {name}
              </h2>
              <p className="mt-1 text-[17px] font-bold" style={{ color: colors.textMuted }}>
                {aboutTitle}
              </p>
            </div>
            <button type="button" aria-label="Yopish" className="flex h-9 w-9 shrink-0 items-center justify-center" onClick={onClose}>
              <CloseIcon size={22} color={colors.icon} />
            </button>
          </div>
        ) : (
          <div className="px-4 pt-2.5 pb-2 select-none" style={{ touchAction: "none" }} {...sheet.dragHandlers}>
            <div className="mx-auto mb-3 h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
            <h2 className="px-1 text-[18px] leading-6 font-bold" style={{ color: colors.text }}>
              {name}
            </h2>
            <p className="mt-1 px-1 text-[17px] font-bold" style={{ color: colors.textMuted }}>
              {aboutTitle}
            </p>
          </div>
        )}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <p className="text-[15px] leading-[22px]" style={{ color: colors.text }}>
            {aboutText}
          </p>
        </div>
      </div>
    </div>
  );
}
