import { BookmarkIcon } from '@/components/icons';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import type { Movie } from '@/src/types/movie';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const SAVE_ACTIVE = '#1E4FD6';

type WishlistCardProps = {
  movie: Movie;
  language: AppLanguage;
  width: number;
  onPress?: (movie: Movie) => void;
  onRemoved?: (movieId: number) => void;
};

export function WishlistCard({
  movie,
  language,
  width,
  onPress,
  onRemoved,
}: WishlistCardProps) {
  const { colors } = useTheme();
  const toggle = useWishlistStore((s) => s.toggle);
  const [busy, setBusy] = useState(false);
  const lang = language === 'en' ? 'uz' : language;
  const title = movie.title[lang] ?? movie.title.uz;
  const posterPath = movie.homeImgPoster[lang] ?? movie.homeImgPoster.uz;
  const poster = resolveMoviePoster(posterPath);
  const posterH = Math.round(width * 1.3);

  const onToggleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await toggle(movie.id);
      if (!saved) onRemoved?.(movie.id);
    } finally {
      setBusy(false);
    }
  };

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
          },
        ]}
      >
        {poster ? (
          <Image source={poster} style={styles.poster} contentFit="fill" />
        ) : null}

        <Pressable
          style={styles.saveBtn}
          onPress={onToggleSave}
          hitSlop={8}
          disabled={busy}
        >
          <BookmarkIcon size={20} color={SAVE_ACTIVE} filled />
        </Pressable>

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
    marginBottom: 14,
  },
  posterWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  saveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
