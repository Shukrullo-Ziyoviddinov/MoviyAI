"use client";
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';

export function ChatSkeleton() {
  const { isDark } = useTheme(); const t = useT();
  const bone = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.10)';
  return <div role="status" aria-label={t('common.loading')} className="w-full px-3.5">
    <div aria-hidden="true" className="space-y-8">
      {[0, 1, 2].map(group => <div key={group}>
        <div className="mb-6 ml-auto h-11 w-[42%] max-w-[240px] animate-pulse rounded-[18px] motion-reduce:animate-none" style={{ backgroundColor: bone }} />
        <div className="space-y-3">
          {[96, 100, 82, 57].map((width, index) => <div key={index} className="h-3.5 animate-pulse rounded-md motion-reduce:animate-none" style={{ width: `${width}%`, backgroundColor: bone }} />)}
        </div>
      </div>)}
    </div>
  </div>;
}
