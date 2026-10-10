import { fetchBanners, type Banner } from '@/src/api/banners';
import { useTheme } from '@/src/stores/useThemeStore';
import { resolveBannerImage } from '@/src/utils/bannerImages';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable, ScrollView } from 'react-native-gesture-handler';

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HomeBanner() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [items, setItems] = useState<Banner[]>([]);
  const height = Math.round(width * 0.92);
  const fadeH = Math.round(height * 0.42);

  useEffect(() => {
    let alive = true;
    fetchBanners()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  const fadeColors = [
    'transparent',
    hexToRgba(colors.bg, 0.2),
    hexToRgba(colors.bg, 0.5),
    hexToRgba(colors.bg, 0.78),
    hexToRgba(colors.bg, 0.94),
    colors.bg,
  ] as const;

  return (
    <ScrollView
      horizontal
      pagingEnabled
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      style={{ width, height }}
    >
      {items.map((item) => {
        const movieId = item.movieId.find((id) => Number.isFinite(id));
        const source = resolveBannerImage(item.img);
        return (
          <Pressable
            key={item.img}
            style={{ width, height }}
            onPress={() => {
              if (movieId) router.push(`/movie/${movieId}`);
            }}
          >
            {source ? (
              <Image
                source={source}
                style={styles.image}
                contentFit="cover"
                contentPosition="top"
              />
            ) : null}
            <LinearGradient
              colors={[...fadeColors]}
              locations={[0, 0.18, 0.4, 0.62, 0.82, 1]}
              style={[styles.fade, { height: fadeH }]}
              pointerEvents="none"
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
