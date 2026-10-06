import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { useTheme } from '@/src/stores/useThemeStore';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import type { Movie } from '@/src/types/movie';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

type SimilarMovieCardProps = {
  movie: Movie;
  language: AppLanguage;
  width: number;
};

export function SimilarMovieCard({
  movie,
  language,
  width,
}: SimilarMovieCardProps) {
  const { colors } = useTheme();
  const lang = language === 'en' ? 'uz' : language;
  const title = movie.title[lang] ?? movie.title.uz;
  const poster = resolveMoviePoster(movie.homeImgPoster);
  const posterH = Math.round(width * 1.35);

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={() => router.push(`/movie/${movie.id}`)}
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
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingLabel}>IMDb</Text>
          <Text style={styles.ratingValue}>
            {Number(movie.ratingImdb).toFixed(1)}
          </Text>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  posterWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  ratingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5C518',
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
