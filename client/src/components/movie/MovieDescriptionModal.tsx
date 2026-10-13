"use client";

import type { MovieDescription } from "@/api/movies";
import { CloseIcon } from "@/components/icons";
import type { MovieCopy } from "@/data/movieCopy";
import { useTheme } from "@/components/theme/theme-state";
import { SHEET_CLOSE_MS, SHEET_EASE, SHEET_OPEN_MS, useSheetMotion } from "@/components/movie/useSheetMotion";

export function MovieDescriptionModal({
  open,
  onClose,
  description,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  description: MovieDescription | null;
  copy: MovieCopy;
}) {
  const { colors } = useTheme();
  const sheet = useSheetMotion(open, onClose);
  if (!sheet.mounted || !description) return null;

  const rows = [
    { key: "year", label: copy.year, value: String(description.year || "") },
    { key: "country", label: copy.country, value: description.country },
    { key: "duration", label: copy.duration, value: description.duration ? `${description.duration} ${copy.minutes}` : "" },
    { key: "director", label: copy.director, value: description.director },
  ].filter((row) => row.value);

  const motion =
    sheet.dragging || !sheet.ready
      ? "none"
      : `transform ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}, opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`;

  return (
    <div className={`fixed inset-0 z-50 flex ${sheet.desktop ? "items-center justify-center p-6" : "items-end"}`}>
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
            ? "relative flex max-h-[82vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border"
            : "relative flex h-[min(82dvh,calc(100dvh-24px))] w-full flex-col overflow-hidden rounded-t-[22px] border-t"
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
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="px-1 text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.aboutTitle}
            </h2>
            <button type="button" aria-label="Yopish" className="flex h-9 w-9 items-center justify-center" onClick={onClose}>
              <CloseIcon size={22} color={colors.icon} />
            </button>
          </div>
        ) : (
          <div className="px-4 pt-2.5 pb-2 select-none" style={{ touchAction: "none" }} {...sheet.dragHandlers}>
            <div className="mx-auto mb-3 h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
            <h2 className="px-1 text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.aboutTitle}
            </h2>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <p className="text-[15px] leading-[22px] whitespace-pre-line" style={{ color: colors.text }}>
            {description.text}
          </p>
          {rows.length > 0 ? (
            <div className="mt-3.5 overflow-hidden rounded-[14px] border" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 px-3.5 py-3"
                  style={index < rows.length - 1 ? { borderBottom: `1px solid ${colors.borderSoft}` } : undefined}
                >
                  <span className="text-[14px] font-semibold" style={{ color: colors.textMuted }}>
                    {row.label}
                  </span>
                  <span className="min-w-0 text-right text-[14px] font-bold" style={{ color: colors.text }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
