"use client";

import { useTheme } from '@/components/theme/theme-state';
import {useT} from '@/i18n/useT';
import type {ChatStage} from '@/types/chat-progress';

export function AiWaiting({stage}:{stage?:ChatStage|null}) {
  const { colors } = useTheme();
  const t=useT();
  return <div role="status" className="mb-5 flex min-h-14 items-center gap-3 px-3.5 py-3" style={{ color: colors.textMuted }}>
    <svg className="ai-film-reel shrink-0" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" style={{ color: colors.accentBright }}>
      <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2" fill="currentColor" />
      <circle cx="14" cy="7" r="3" fill="currentColor" opacity=".7" />
      <circle cx="21" cy="14" r="3" fill="currentColor" opacity=".7" />
      <circle cx="14" cy="21" r="3" fill="currentColor" opacity=".7" />
      <circle cx="7" cy="14" r="3" fill="currentColor" opacity=".7" />
    </svg>
    <span className="text-sm">{t('chat.progress.'+(stage??'preparing'))}<span className="ai-waiting-dots" aria-hidden="true">...</span></span>
  </div>;
}
