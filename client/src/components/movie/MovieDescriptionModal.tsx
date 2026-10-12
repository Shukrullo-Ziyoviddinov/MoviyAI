"use client";

import type { MovieDescription } from "@/api/movies";
import type { MovieCopy } from "@/data/movieCopy";
import { useTheme } from "@/components/theme/theme-state";

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
  if (!open || !description) return null;
  const rows = [
    { key: "year", label: copy.year, value: String(description.year || "") },
    { key: "country", label: copy.country, value: description.country },
    { key: "duration", label: copy.duration, value: description.duration ? `${description.duration} ${copy.minutes}` : "" },
    { key: "director", label: copy.director, value: description.director },
  ].filter((row) => row.value);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-3xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
        style={{ backgroundColor: colors.bg }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full" style={{ backgroundColor: colors.borderSoft }} />
        <h2 className="text-[17px] font-bold" style={{ color: colors.text }}>
          {copy.aboutTitle}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <p key={row.key} className="text-[14px]" style={{ color: colors.text }}>
              <span className="font-bold">{row.label}: </span>
              {row.value}
            </p>
          ))}
        </div>
        <p className="mt-4 text-[14px] leading-[21px] whitespace-pre-line" style={{ color: colors.text }}>
          {description.text}
        </p>
      </div>
    </div>
  );
}
