import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fetchSearchHistory, deleteSearchHistory, type SearchHistoryItem } from '@/src/api/media-search';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { CloseIcon } from '@/components/icons';

export function SearchHistory({ version, onOpen, onHasItems }: { version: number; onOpen: (id: string) => void; onHasItems: (value: boolean) => void }) {
  const { t } = useTranslation(), { colors } = useTheme();
  const token = useAuthStore(state => state.token), language = useLanguageStore(state => state.language);
  const [items, setItems] = useState<SearchHistoryItem[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [itemsOwner, setItemsOwner] = useState(token);
  const visibleItems = itemsOwner === token ? items : [];
  const [error, setError] = useState(false), [loading, setLoading] = useState(false), [deleting, setDeleting] = useState<string | null>(null);
  const busy = useRef(false), owner = useRef(token), alive = useRef(true), controller = useRef<AbortController | null>(null);
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
  useFocusEffect(useCallback(() => {
    alive.current = true; owner.current = token;
    if (token) void load(null);
    return () => { alive.current = false; controller.current?.abort(); busy.current = false; };
  }, [load, token, version]));
  useEffect(() => { onHasItems(!!token && itemsOwner === token && items.length > 0); }, [token, itemsOwner, items.length, onHasItems]);
  async function remove(id: string) {
    if (deleting) return;
    setDeleting(id);
    try { await deleteSearchHistory(id); if (alive.current && owner.current === token) { setItems(rows => rows.filter(row => row.id !== id)); if (items.length === 1 && cursor) await load(null); } }
    catch { if (alive.current) setError(true); }
    finally { if (alive.current) setDeleting(null); }
  }
  if (!token || !visibleItems.length && !error) return null;
  return <FlatList
    style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 32 }}
    data={visibleItems} keyExtractor={item => item.id} initialNumToRender={10} maxToRenderPerBatch={6}
    ListHeaderComponent={<Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>{t('mediaSearch.history')}</Text>}
    renderItem={({ item }) => <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.panelSoft }}>
      <Pressable disabled={deleting === item.id} onPress={() => onOpen(item.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={item.poster ? { uri: item.poster } : undefined} contentFit="cover" style={{ width: 40, height: 60, borderRadius: 8, backgroundColor: colors.panel }} />
        <Text numberOfLines={2} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{language === 'ru' ? item.titleRu || item.title : language === 'uz' ? item.titleUz || item.title : item.title}</Text>
      </Pressable>
      <Pressable accessibilityLabel={t('mediaSearch.delete')} disabled={!!deleting} onPress={() => void remove(item.id)} style={{ width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' }}><CloseIcon size={20} color={colors.textMuted} /></Pressable>
    </View>}
    ListFooterComponent={<>
      {error && <Text style={{ color: colors.text, paddingVertical: 8 }}>{t('mediaSearch.historyError')}</Text>}
      {(cursor || error) && <Pressable disabled={loading} onPress={() => void load(error ? null : cursor)} style={{ alignSelf: 'center', padding: 12 }}><Text style={{ color: colors.text }}>{t(loading ? 'common.loading' : error ? 'chat.retry' : 'listing.more')}</Text></Pressable>}
    </>}
  />;
}
