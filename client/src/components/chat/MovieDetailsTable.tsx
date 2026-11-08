"use client";
import type { MovieSearchResult } from '@/types/chat';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';
import { movieTableRows } from './movie-table';

export function MovieDetailsTable({movie}:{movie:MovieSearchResult}) {
  const {colors}=useTheme();const t=useT();
  const rows=movieTableRows(movie,t('chat.movieTable.minute'));
  if(!rows.length)return null;
  return <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border" style={{borderColor:colors.borderSoft,backgroundColor:colors.panel}}>
    <div className="border-b px-4 py-3.5" style={{borderColor:colors.borderSoft}}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{color:colors.textMuted}}>{t('chat.movieTable.title')}</p>
      <h4 className="text-base font-bold leading-6" style={{color:colors.text}}>{movie.title}{movie.year?` (${movie.year})`:''}</h4>
    </div>
    <div data-media-strip tabIndex={0} role="region" aria-label={t('chat.movieTable.title')} className="no-scrollbar max-w-full overflow-x-auto" style={{overscrollBehaviorX:'contain'}}>
      <table className="w-full min-w-[540px] border-collapse text-left text-[13px] leading-6">
        <tbody>{rows.map(row=><tr key={row.key} className="border-b last:border-b-0" style={{borderColor:colors.borderSoft}}>
          <th scope="row" className="w-[190px] whitespace-nowrap border-r px-4 py-3 font-medium" style={{backgroundColor:colors.panelSoft,borderColor:colors.borderSoft,color:colors.textMuted}}>{t('chat.movieTable.'+row.key)}</th>
          <td className="whitespace-nowrap px-4 py-3 font-medium" style={{color:colors.text}}>
            {row.value} {row.source&&<a href={row.source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={t('chat.movieSources')} className="ml-2 inline-flex px-1 text-sm" style={{color:colors.accentBright}}>↗</a>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
