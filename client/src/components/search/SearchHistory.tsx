"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSearchHistory, deleteSearchHistory, type SearchHistoryItem } from '@/api/media-search';
import { useAuth } from '@/components/auth/auth-state';
import { useLanguage } from '@/components/language/language-state';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';
import { CloseIcon } from '@/components/icons';

export function SearchHistory({ active, version, onOpen, onHasItems }: { active: boolean; version: number; onOpen: (id: string) => void; onHasItems: (value: boolean) => void }) {
  const { token } = useAuth(), { language } = useLanguage(), { colors } = useTheme(), t = useT();
  const [items, setItems] = useState<SearchHistoryItem[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [itemsOwner, setItemsOwner] = useState(token);
  const visibleItems = itemsOwner === token ? items : [];
  const [loading, setLoading] = useState(false), [error, setError] = useState(false), [deleting, setDeleting] = useState<string | null>(null);
  const busy = useRef(false), owner = useRef(token), alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (next: string | null) => {
    if (busy.current || !token) return;
    busy.current = true; const abort = new AbortController(); controller.current = abort;
    setLoading(true); setError(false);
    try {
      const result = await fetchSearchHistory(next, abort.signal);
      if (!abort.signal.aborted) { setItems(old => next ? [...old, ...result.items.filter(item => !old.some(row => row.id === item.id))] : result.items); setItemsOwner(token); setCursor(result.nextCursor); }
    } catch { if (!abort.signal.aborted) setError(true); }
    finally { if (controller.current === abort) { busy.current = false; if (alive.current) setLoading(false); } }
  }, [token]);
  useEffect(() => {
    alive.current = true; owner.current = token;
    const frame = requestAnimationFrame(() => { if (active && token) void load(null); });
    return () => { cancelAnimationFrame(frame); alive.current = false; controller.current?.abort(); busy.current = false; };
  }, [active, token, version, load]);
  useEffect(() => { onHasItems(!!token && itemsOwner === token && items.length > 0); }, [token, itemsOwner, items.length, onHasItems]);
  async function remove(id: string) {
    if (deleting) return;
    setDeleting(id);
    try { await deleteSearchHistory(id); if (alive.current && owner.current === token) { setItems(rows => rows.filter(row => row.id !== id)); if (items.length === 1 && cursor) await load(null); } }
    catch { if (alive.current) setError(true); }
    finally { if (alive.current) setDeleting(null); }
  }
  if (!token || !visibleItems.length && !error) return null;
  return <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2.5 pb-8" aria-label={t('mediaSearch.history')}>
    <h2 className="mb-3 text-lg font-bold" style={{ color: colors.text }}>{t('mediaSearch.history')}</h2>
    {visibleItems.map(item => <div key={item.id} className="mb-2 flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: colors.panelSoft }}>
      <button type="button" onClick={() => onOpen(item.id)} disabled={deleting === item.id} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="h-[60px] w-10 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: colors.panel }}>{item.poster && <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
        <span className="min-w-0 break-words text-sm font-semibold" style={{ color: colors.text }}>{language === 'ru' ? item.titleRu || item.title : language === 'uz' ? item.titleUz || item.title : item.title}</span>
      </button>
      <button type="button" onClick={() => void remove(item.id)} disabled={!!deleting} aria-label={t('mediaSearch.delete')} className="flex h-10 w-10 shrink-0 items-center justify-end rounded-full disabled:opacity-40"><CloseIcon size={20} color={colors.textMuted} /></button>
    </div>)}
    {error && <p role="alert" className="py-2 text-sm" style={{ color: colors.text }}>{t('mediaSearch.historyError')}</p>}
    {(cursor || error) && <button type="button" disabled={loading} onClick={() => void load(error ? null : cursor)} className="mx-auto mt-3 block rounded-xl px-4 py-3" style={{ color: colors.text, backgroundColor: colors.panelSoft }}>{t(loading ? 'common.loading' : error ? 'chat.retry' : 'listing.more')}</button>}
  </section>;
}
