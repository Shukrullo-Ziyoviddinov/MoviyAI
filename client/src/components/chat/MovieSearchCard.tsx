"use client";
import type { MovieSearchResult } from '@/types/chat';
import { useChat } from './chat-state';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';
import {MovieTrailer} from './MovieTrailer';
import { MovieDetailsTable } from './MovieDetailsTable';
import type {ReactNode} from 'react';

export function MovieSearchCard({ movie,children,confirmation }: { movie: MovieSearchResult;children?:ReactNode;confirmation?:string }) {
  const { colors } = useTheme(); const { openViewer } = useChat(); const t = useT();
  return <div className="mt-3 w-full">
    <p className="text-base font-semibold" style={{ color: colors.text }}>{movie.title}{movie.year ? ` (${movie.year})` : ''}</p>
    {movie.titleUz && <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>UZ: {movie.titleUz}</p>}
    {movie.titleRu && <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>RU: {movie.titleRu}</p>}
    <p className="mt-1 text-sm" style={{color:colors.textMuted}}>EN: {movie.title}</p>
    {movie.posters.length > 0 && <div data-media-strip className="mt-3 grid gap-2 overflow-hidden rounded-2xl border p-2 md:flex"
      style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, gridTemplateColumns:movie.posters.length===1?'minmax(0,1fr)':'repeat(2,minmax(0,1fr))' }} aria-label={t('chat.moviePosters')}>
      {movie.posters.slice(0,2).map((poster, index) => <button key={poster.url} type="button" className="aspect-[2/3] w-full min-w-0 overflow-hidden rounded-xl border md:aspect-auto md:h-44 md:w-28 md:shrink-0" style={{ borderColor: colors.borderSoft }}
        onClick={() => openViewer({ id: `${movie.title}-${index}`, type: 'image', uri: poster.url })}>
        <img src={poster.url} alt={movie.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      </button>)}
    </div>}
    <MovieTrailer trailer={movie.trailer}/>
    <MovieDetailsTable movie={movie}/>
    {children}
    <p className="mt-4 mb-1 text-xs font-medium" style={{ color: colors.textMuted }}>{t('chat.movieSources')}</p>
    <div className="flex flex-wrap gap-2">
      {movie.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
        className="max-w-full break-words rounded-lg border px-3 py-2 text-xs" style={{ color: colors.accentBright, borderColor: colors.borderSoft }}>{source.title}</a>)}
    </div>
    {confirmation&&<p className="mt-5 text-[15px] leading-7" style={{color:colors.text}}>{confirmation}</p>}
  </div>;
}
