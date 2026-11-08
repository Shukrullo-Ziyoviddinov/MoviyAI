"use client";

import { useTheme } from "@/components/theme/theme-state";
import type { MovieSearchResult, CharacterImage } from '@/types/chat';
import { MovieSearchCard } from './MovieSearchCard';
import { FormattedAnswer } from './FormattedAnswer';

export function TextMessageBubble({ text, role = "user", movie, characterImages }: { text: string; role?: "user" | "model"; movie?: MovieSearchResult | null; characterImages?: CharacterImage[] }) {
  const { colors } = useTheme();

  if (role === "model") return <div className="mb-5 w-full px-3.5 py-2" style={{ color: colors.text }}><FormattedAnswer text={text} characterImages={characterImages} hideCitations={!!movie?.sources.length}/>{movie && <MovieSearchCard movie={movie}/>}</div>;

  return (
    <div className="mb-2.5 flex w-full justify-end px-3.5">
      <div className="relative max-w-[min(78%,420px)]">
        <div
          className="rounded-tl-[18px] rounded-tr-[18px] rounded-br-none rounded-bl-[18px] px-3.5 py-2.5 text-[15px] leading-[21px]"
          style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
        >
          {text}
        </div>
        <svg
          className="absolute right-[-7px] bottom-0"
          width="12"
          height="16"
          viewBox="0 0 12 16"
          aria-hidden="true"
        >
          <path d="M0 0 C2 6 4 12 12 16 L0 16 Z" fill={colors.accent} />
        </svg>
      </div>
    </div>
  );
}
