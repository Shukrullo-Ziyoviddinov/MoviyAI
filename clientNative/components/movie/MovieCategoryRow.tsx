import { FlatList } from 'react-native';
import { MovieCard } from '@/components/movie/MovieCard';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { Movie } from '@/src/types/movie';
import { StyleSheet, Text, View } from 'react-native';

const GAP = 12;

type MovieCategoryRowProps = {
  title: string;
  movies: Movie[];
  language: AppLanguage;
  cardWidth: number;
  contentPad?: number;
};

export function MovieCategoryRow({
  title,
  movies,
  language,
  cardWidth,
  contentPad = 16,
}: MovieCategoryRowProps) {
  const { colors } = useTheme();

  if (movies.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text
        style={[styles.title, { color: colors.text, paddingHorizontal: contentPad }]}
      >
        {title}
      </Text>
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(movie) => String(movie.id)}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: cardWidth + GAP, offset: (cardWidth + GAP) * index, index })}
        contentContainerStyle={[styles.row, { paddingHorizontal: contentPad }]}
        renderItem={({ item: movie }) => (
          <View key={movie.id} style={{ width: cardWidth, marginRight: GAP }}>
            <MovieCard movie={movie} language={language} width={cardWidth} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    alignItems: 'flex-start',
  },
});
