"use client";

import { useTheme } from '@/components/theme/theme-state';
import {useT} from '@/i18n/useT';
import type {ChatFailureCode} from '@/types/chat-progress';

export function AiError({ message,failureCode, onRetry, disabled = false }: {
  message: string;failureCode?:ChatFailureCode|null; onRetry: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const t=useT();
  return <div className="mb-5 w-full px-3.5 py-3">
    <div role="alert" className="flex items-start gap-2.5" style={{ color: colors.textMuted }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#d99a37" strokeWidth="1.7" className="mt-0.5 shrink-0" aria-hidden="true">
        <path d="M10.3 4.1 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
        <path d="M12 9v4" strokeLinecap="round" /><circle cx="12" cy="16.5" r=".8" fill="#d99a37" stroke="none" />
      </svg>
      <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6">{failureCode?t('chat.failures.'+failureCode):message}</p>
    </div>
    <button type="button" onClick={onRetry} disabled={disabled}
      className="mt-3 ml-8 flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
      style={{ color: colors.accentBright, borderColor: colors.borderSoft }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 7v5h-5M19.1 15a7.5 7.5 0 1 1-.7-7.6L20 12" />
      </svg>
      {t('chat.retry')}
    </button>
  </div>;
}
