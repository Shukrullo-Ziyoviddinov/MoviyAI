"use client";
import type { MovieSearchResult } from '@/types/chat';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';

export function UzbekMovieLinks({links}:{links:MovieSearchResult['uzbekLinks']}) {
 const {colors}=useTheme();const t=useT();if(!links?.length)return null;
 return <section className="mt-6 rounded-2xl border p-4 sm:p-5" style={{backgroundColor:colors.panelSoft,borderColor:colors.accentBright}} aria-label={t('chat.uzbekMovies.heading')}>
  <h3 className="text-lg font-semibold" style={{color:colors.text}}>▶ {t('chat.uzbekMovies.heading')}</h3>
  <p className="mt-1 text-xs leading-5" style={{color:colors.textMuted}}>{t('chat.uzbekMovies.note')}</p>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">{links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 transition-opacity hover:opacity-80" style={{backgroundColor:colors.panel,borderColor:colors.borderSoft}}>
   <span className="min-w-0"><span className="block break-words text-sm font-semibold" style={{color:colors.text}}>{link.title}</span><span className="mt-1 block text-xs" style={{color:colors.textMuted}}>{link.site}</span><span className="mt-2 block text-xs font-semibold" style={{color:colors.accentBright}}>{t('chat.uzbekMovies.open')}</span></span><span aria-hidden style={{color:colors.accentBright}}>↗</span>
  </a>)}</div>
 </section>;
}
