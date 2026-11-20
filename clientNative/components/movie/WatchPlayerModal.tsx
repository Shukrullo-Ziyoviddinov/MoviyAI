import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, Modal, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { apiBaseUrl } from '@/src/api/client';
import { verifiedEmbed } from '@/src/utils/watch-provider';
import { resolveWatchSource } from '@/src/utils/watch-resolution';

export function WatchPlayerModal({ url, title, onClose, onOther, hasOther, children }: {
  url: string; title?: string; onClose: () => void; onOther: () => void; hasOther: boolean; children?: ReactNode;
}) {
  const [embed, setEmbed] = useState<string | null>(null), [loading, setLoading] = useState(true), [foreground, setForeground] = useState(AppState.currentState === 'active');
  const insets = useSafeAreaInsets(); const { i18n } = useTranslation();
  const labels = i18n.language.startsWith('ru') ? ['Смотреть из других источников', 'Открыть на сайте', 'Проверяем плеер…', 'Плеер недоступен. Откройте источник.', 'Закрыть']
    : i18n.language.startsWith('en') ? ['Watch from other sources', 'Open on website', 'Checking player…', 'Player unavailable. Open the source.', 'Close']
    : ['Boshqa manbalardan tomosha qilish', 'Saytda ochish', 'Player tekshirilmoqda…', 'Player ochilmadi. Manbani oching.', 'Yopish'];
  useEffect(() => { const subscription = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => subscription.remove(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setEmbed(null); setLoading(true);
    void resolveWatchSource(apiBaseUrl, url, controller.signal)
      .then(embedUrl => { if (!controller.signal.aborted) setEmbed(embedUrl); })
      .catch(() => {}).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url]);
  return <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
    <View style={{ flex: 1, backgroundColor: '#05070d', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontWeight: '700', fontSize: 18 }}>{title}</Text>
        <Pressable onPress={onClose} accessibilityLabel={labels[4]} style={{ padding: 12 }}><Text style={{ color: '#fff', fontSize: 26 }}>×</Text></Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
        <View style={{ width: '100%', aspectRatio: 16 / 9, justifyContent: 'center', backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#ffffff1a', padding: 8, overflow: 'hidden' }}>
        {embed && verifiedEmbed(url, embed) && foreground ? <WebView key={embed} source={{ uri: embed }} allowsFullscreenVideo allowsInlineMediaPlayback
          javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={request => request.isTopFrame === false && request.url.startsWith('https://') || !!verifiedEmbed(url, request.url) || request.url === 'about:blank'}
          onError={() => { setEmbed(null); setLoading(false); }} style={{ flex: 1, backgroundColor: '#000', borderRadius: 6 }} />
          : <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>{loading ? labels[2] : labels[3]}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
        {hasOther && <Pressable onPress={onOther} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 16, backgroundColor: '#214bd0' }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 14 }}>{labels[0]}</Text></Pressable>}
        <Pressable onPress={() => { onClose(); void Linking.openURL(url).catch(() => {}); }} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 16, backgroundColor: '#ffffff1a' }}><Text style={{ color: '#fff', textAlign: 'center', fontSize: 14 }}>{labels[1]} ↗</Text></Pressable>
      </View>
      {children}
    </View>
  </Modal>;
}
