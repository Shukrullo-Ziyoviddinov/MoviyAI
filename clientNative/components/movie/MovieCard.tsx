import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { useTheme } from '@/src/stores/useThemeStore';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import type { Movie } from '@/src/types/movie';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MovieCardProps = {
  movie: Movie;
  language: AppLanguage;
  width: number;
  onPress?: (movie: Movie) => void;
};

export function MovieCard({ movie, language, width, onPress }: MovieCardProps) {
  const { colors } = useTheme();
  const lang = language === 'en' ? 'uz' : language;
  const title = movie.title[lang] ?? movie.title.uz;
  const posterPath = movie.homeImgPoster[lang] ?? movie.homeImgPoster.uz;
  const poster = resolveMoviePoster(posterPath);
  const posterH = Math.round(width * 1.45);

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={() => onPress?.(movie)}
    >
      <View
        style={[
          styles.posterWrap,
          {
            width,
            height: posterH,
            backgroundColor: colors.panelSoft,
            borderColor: colors.borderSoft,
          },
        ]}
      >
        {poster ? (
          <Image source={poster} style={styles.poster} contentFit="cover" />
        ) : null}
      </View>
      <Text
        style={[styles.title, { color: colors.text }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  posterWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  title: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
