import { Linking, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { MovieSearchResult } from '@/src/types/chat';
import { useTheme } from '@/src/stores/useThemeStore';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import {MovieTrailer} from './MovieTrailer';
import { MovieDetailsTable } from './MovieDetailsTable';

export function MovieSearchCard({ movie,children,confirmation }: { movie: MovieSearchResult;children?:ReactNode;confirmation?:string }) {
  const { colors } = useTheme(); const { t } = useTranslation(); const open = useMediaViewerStore(state => state.open);
  return <View style={{ width: '100%', marginTop: 12 }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{movie.title}{movie.year ? ` (${movie.year})` : ''}</Text>
    {movie.titleUz && <Text style={{ color: colors.textMuted, marginTop: 4 }}>UZ: {movie.titleUz}</Text>}
    {movie.titleRu && <Text style={{ color: colors.textMuted, marginTop: 4 }}>RU: {movie.titleRu}</Text>}
    <Text style={{color:colors.textMuted,marginTop:4}}>EN: {movie.title}</Text>
    {movie.posters.length > 0 && <View accessibilityLabel={t('chat.moviePosters')} style={{ marginTop: 12, flexDirection:'row', gap:8, padding:8, backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
      {movie.posters.slice(0,2).map((poster, index) => <Pressable key={poster.url} accessibilityRole="button" accessibilityLabel={movie.title}
        onPress={() => open({ id: `${movie.title}-${index}`, type: 'image', uri: poster.url })}
        style={{ flex:1,minWidth:0,aspectRatio:2/3, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft }}>
        <Image source={{ uri: poster.url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      </Pressable>)}
    </View>}
    <MovieTrailer trailer={movie.trailer}/>
    <MovieDetailsTable movie={movie}/>
    {children}
    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 16, marginBottom: 4 }}>{t('chat.movieSources')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {movie.sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => { void Linking.openURL(source.url).catch(() => undefined); }}
        style={{ maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8 }}>
        <Text style={{ color: colors.accentBright, fontSize: 12 }}>{source.title}</Text>
      </Pressable>)}
    </View>
    {!!confirmation&&<Text style={{color:colors.text,fontSize:15,lineHeight:27,marginTop:20}}>{confirmation}</Text>}
  </View>;
}
