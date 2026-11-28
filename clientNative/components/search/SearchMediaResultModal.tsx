import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoPreview } from '@/components/chat/VideoPreview';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { searchFromMedia, type SearchMedia } from '@/src/api/media-search';
import { useTheme } from '@/src/stores/useThemeStore';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import type { MovieSearchResult } from '@/src/types/chat';
import type { ChatStage } from '@/src/types/chat-progress';
import { UzbekMovieLinks } from '@/components/chat/UzbekMovieLinks';

export function SearchMediaResultModal({ media, onClose }: { media: SearchMedia; onClose: () => void }) {
  const { t } = useTranslation(), { colors } = useTheme();
  const language = useLanguageStore(state => state.language);
  const insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true), [attempt, setAttempt] = useState(0);
  const [movie, setMovie] = useState<MovieSearchResult | null>(null), [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<ChatStage>('preparing');
  const id = useRef(Crypto.randomUUID()), controller = useRef<AbortController | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    useSideMenuStore.getState().suspendGestures();
    return () => { useSideMenuStore.getState().resumeGestures(); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort;
    searchFromMedia(media, id.current, language, abort.signal, value => { if (!abort.signal.aborted) setStage(value); })
      .then(result => { if (!abort.signal.aborted) { setMovie(result); setError(null); } })
      .catch(cause => { if (!abort.signal.aborted) setError(cause.failureCode === 'invalid_media' ? t('mediaSearch.invalid') : t(`chat.failures.${cause.name === 'TimeoutError' ? 'timeout' : cause.failureCode || 'unknown'}`)); });
    return () => abort.abort();
  }, [media, attempt]);
  function close() {
    if (closeTimer.current) return;
    controller.current?.abort(); setVisible(false);
    closeTimer.current = setTimeout(onClose, 300);
  }
  return <Modal visible={visible} transparent animationType={width >= 768 ? 'fade' : 'slide'} statusBarTranslucent onRequestClose={close}>
    <View style={{ flex: 1, justifyContent: width >= 768 ? 'center' : 'flex-end', alignItems: 'center', paddingTop: insets.top + 12 }}>
      <Pressable accessibilityLabel={t('common.close')} onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000099' }} />
      <View style={{ width: width >= 768 ? Math.min(700, width - 48) : '100%', maxHeight: '85%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: width >= 768 ? 24 : 0, borderBottomRightRadius: width >= 768 ? 24 : 0, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSoft }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('mediaSearch.heading')}</Text>
          <Pressable accessibilityLabel={t('common.close')} onPress={close} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelSoft }}><Text style={{ color: colors.text, fontSize: 27 }}>×</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 20) }}>
          {media.type === 'video' ? <View style={{ width: '100%', height: 190, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}><VideoPreview uri={media.uri} /></View> : <Image source={{ uri: media.uri }} contentFit="contain" style={{ width: '100%', height: 190, borderRadius: 14 }} />}
          {!movie && !error && <View style={{ paddingVertical: 30, alignItems: 'center', gap: 12 }}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textMuted }}>{t(`chat.progress.${stage}`)}…</Text></View>}
          {error && <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}><Text style={{ color: colors.text, textAlign: 'center' }}>{error}</Text><Pressable onPress={() => { setError(null); setAttempt(value => value + 1); }} style={{ padding: 14, backgroundColor: colors.panelSoft, borderRadius: 12 }}><Text style={{ color: colors.text }}>{t('chat.retry')}</Text></Pressable></View>}
          {movie && <View style={{ paddingTop: 20 }}>
            <Text style={{ fontSize: 21, fontWeight: '700', color: colors.text }}>{movie.titleUz || movie.title}{movie.year ? ` (${movie.year})` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>{movie.posters.slice(0, 2).map(poster => <Image key={poster.url} source={{ uri: poster.url }} contentFit="cover" style={{ flex: 1, aspectRatio: 2 / 3, borderRadius: 12 }} />)}</View>
            <UzbekMovieLinks links={movie.uzbekLinks} />
            {!movie.uzbekLinks?.length && <Text style={{ color: colors.textMuted, marginTop: 16 }}>{t('mediaSearch.noLinks')}</Text>}
          </View>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
