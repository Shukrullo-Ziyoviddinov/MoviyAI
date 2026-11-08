"use client";
import type { MovieSearchResult } from '@/types/chat';
import { useChat } from './chat-state';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';
import { MovieDetailsTable } from './MovieDetailsTable';

export function MovieSearchCard({ movie }: { movie: MovieSearchResult }) {
  const { colors } = useTheme(); const { openViewer } = useChat(); const t = useT();
  return <div className="mt-3 w-full">
    <p className="text-base font-semibold" style={{ color: colors.text }}>{movie.title}{movie.year ? ` (${movie.year})` : ''}</p>
    {movie.titleUz && <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>UZ: {movie.titleUz}</p>}
    {movie.titleRu && <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>RU: {movie.titleRu}</p>}
    {movie.posters.length > 0 && <div data-media-strip className="no-scrollbar mt-3 flex gap-3 overflow-x-auto rounded-2xl border p-3"
      style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, overscrollBehaviorX: 'contain' }} aria-label={t('chat.moviePosters')}>
      {movie.posters.map((poster, index) => <button key={poster.url} type="button" className="h-44 w-28 shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: colors.borderSoft }}
        onClick={() => openViewer({ id: `${movie.title}-${index}`, type: 'image', uri: poster.url })}>
        <img src={poster.url} alt={movie.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      </button>)}
    </div>}
    <MovieDetailsTable movie={movie}/>
    <p className="mt-4 mb-1 text-xs font-medium" style={{ color: colors.textMuted }}>{t('chat.movieSources')}</p>
    <div className="flex flex-wrap gap-2">
      {movie.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
        className="max-w-full break-words rounded-lg border px-3 py-2 text-xs" style={{ color: colors.accentBright, borderColor: colors.borderSoft }}>{source.title}</a>)}
    </div>
  </div>;
}
