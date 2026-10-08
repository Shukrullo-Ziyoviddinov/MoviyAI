import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { BookmarkIcon } from '@/components/icons';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { AppLanguage } from '@/src/stores/useLanguageStore';
import type { Movie } from '@/src/types/movie';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

const SAVE_ACTIVE = '#1E4FD6';
const POSTER_RADIUS = 14;
const NAME_LINE_HEIGHT = 18;
const NAME_LINES = 2;
const NAME_HEIGHT = NAME_LINE_HEIGHT * NAME_LINES;

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
  const isSaved = useWishlistStore((s) => s.isSaved(movie.id));
  const toggle = useWishlistStore((s) => s.toggle);
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const [busy, setBusy] = useState(false);
  const [readyPoster, setReadyPoster] = useState<string | null>(null);
  const lang = language === 'en' ? 'uz' : language;
  const title = movie.title[lang] ?? movie.title.uz;
  const poster = resolveMoviePoster(movie.homeImgPoster);
  const posterKey = movie.homeImgPoster ?? '';
  const posterH = Math.round(width * 1.35);
  const posterReady = posterKey.length > 0 && readyPoster === posterKey;
  const nameReady = Boolean(title?.trim());
  const showPosterChrome = !poster || posterReady;

  const onToggleSave = async () => {
    if (busy) return;
    if (!requireAuth('wishlist')) return;
    setBusy(true);
    try {
      await toggle(movie.id);
    } finally {
      setBusy(false);
    }
  };

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
            borderRadius: POSTER_RADIUS,
            backgroundColor: colors.panelSoft,
            borderColor: colors.borderSoft,
          },
        ]}
      >
        {poster && !posterReady ? (
          <SkeletonLoader
            width={width}
            height={posterH}
            borderRadius={POSTER_RADIUS}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {poster ? (
          <Image
            source={poster}
            style={styles.poster}
            contentFit="cover"
            onLoad={() => setReadyPoster(posterKey)}
            onError={() => setReadyPoster(posterKey)}
          />
        ) : null}

        {showPosterChrome ? (
          <>
            <Pressable
              style={styles.saveBtn}
              onPress={onToggleSave}
              hitSlop={8}
              disabled={busy}
            >
              <BookmarkIcon
                size={20}
                color={isSaved ? SAVE_ACTIVE : '#FFFFFF'}
                filled={isSaved}
              />
            </Pressable>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingLabel}>IMDb</Text>
              <Text style={styles.ratingValue}>
                {Number(movie.ratingImdb).toFixed(1)}
              </Text>
            </View>
          </>
        ) : null}
      </View>
      <View style={[styles.titleSlot, { width, height: NAME_HEIGHT }]}>
        {nameReady ? (
          <Text
            style={[styles.title, { color: colors.text, lineHeight: NAME_LINE_HEIGHT }]}
            numberOfLines={NAME_LINES}
          >
            {title}
          </Text>
        ) : (
          <SkeletonLoader width={width} height={NAME_HEIGHT} borderRadius={8} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  posterWrap: {
    borderWidth: 1,
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
  titleSlot: {
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
});
