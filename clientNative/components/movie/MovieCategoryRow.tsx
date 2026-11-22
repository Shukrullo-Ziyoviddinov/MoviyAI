import { FlatList } from 'react-native';
import { memo } from 'react';
import { MovieCard } from '@/components/movie/MovieCard';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { MovieCardData } from '@/src/types/movie';
import { ChevronRightIcon } from '@/components/icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const GAP = 12;

type MovieCategoryRowProps = {
  title: string;
  ranked?: boolean;
  movies: MovieCardData[];
  onOpen?: () => void;
  language: AppLanguage;
  cardWidth: number;
  contentPad?: number;
};

export const MovieCategoryRow = memo(function MovieCategoryRow({
  title,
  ranked = false,
  movies,
  language,
  cardWidth,
  contentPad = 16,
  onOpen,
}: MovieCategoryRowProps) {
  const { colors } = useTheme();

  if (movies.length === 0) return null;

  return (
    <View style={styles.section}>
      {onOpen && !ranked ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onOpen} style={[styles.heading, { paddingHorizontal: contentPad }]}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 0, flexShrink: 1 }]}>{title}</Text>
        <ChevronRightIcon size={22} color={colors.text} />
      </Pressable> : <Text
        style={[styles.title, { color: colors.text, paddingHorizontal: contentPad }]}
      >
        {title}
      </Text>}
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(movie) => String(movie.id)}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: cardWidth + GAP, offset: (cardWidth + GAP) * index, index })}
        contentContainerStyle={[styles.row, { paddingHorizontal: contentPad }]}
        renderItem={({ item: movie, index }) => (
          <View key={movie.id} style={{ width: cardWidth, marginRight: GAP }}>
            <MovieCard movie={movie} language={language} width={cardWidth} rank={ranked ? index + 1 : undefined} />
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, alignSelf: 'stretch' },
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
