import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { MovieSearchResult } from '@/src/types/chat';
import { useTheme } from '@/src/stores/useThemeStore';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';

export function MovieSearchCard({ movie }: { movie: MovieSearchResult }) {
  const { colors } = useTheme(); const { t } = useTranslation(); const open = useMediaViewerStore(state => state.open);
  return <View style={{ width: '100%', marginTop: 12 }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{movie.title}{movie.year ? ` (${movie.year})` : ''}</Text>
    {movie.titleUz && <Text style={{ color: colors.textMuted, marginTop: 4 }}>UZ: {movie.titleUz}</Text>}
    {movie.titleRu && <Text style={{ color: colors.textMuted, marginTop: 4 }}>RU: {movie.titleRu}</Text>}
    {movie.posters.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 12 }} accessibilityLabel={t('chat.moviePosters')}>
      {movie.posters.map((poster, index) => <Pressable key={poster.url} accessibilityRole="button" accessibilityLabel={movie.title}
        onPress={() => open({ id: `${movie.title}-${index}`, type: 'image', uri: poster.url })}
        style={{ width: 112, height: 176, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft }}>
        <Image source={{ uri: poster.url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      </Pressable>)}
    </ScrollView>}
    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 16, marginBottom: 4 }}>{t('chat.movieSources')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {movie.sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => { void Linking.openURL(source.url).catch(() => undefined); }}
        style={{ maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8 }}>
        <Text style={{ color: colors.accentBright, fontSize: 12 }}>{source.title}</Text>
      </Pressable>)}
    </View>
  </View>;
}
