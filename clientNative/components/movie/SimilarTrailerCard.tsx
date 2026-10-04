import { useTheme } from '@/src/stores/useThemeStore';
import type { Movie } from '@/src/types/movie';
import { buildYoutubeThumbnailUrl } from '@/src/utils/youtubeEmbed';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SimilarTrailerCardProps = {
  movie: Movie;
  language: 'uz' | 'ru';
  onPress: (movie: Movie) => void;
};

export function SimilarTrailerCard({
  movie,
  language,
  onPress,
}: SimilarTrailerCardProps) {
  const { colors } = useTheme();
  const title = movie.title[language] ?? movie.title.uz;
  const text =
    movie.description?.[language]?.text ?? movie.description?.uz?.text ?? '';
  const thumb = buildYoutubeThumbnailUrl(movie.trailers);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.panelSoft,
          borderColor: colors.borderSoft,
        },
      ]}
      onPress={() => onPress(movie)}
    >
      <View style={styles.thumbWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.bgDeep }]} />
        )}
      </View>

      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {text ? (
          <Text
            style={[styles.desc, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {text}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
  },
  thumbWrap: {
    width: 112,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
    gap: 4,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
});
