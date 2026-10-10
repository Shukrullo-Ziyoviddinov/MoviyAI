import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { fetchBanners, type Banner } from '@/src/api/banners';
import { useTheme } from '@/src/stores/useThemeStore';
import { resolveBannerImage } from '@/src/utils/bannerImages';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HomeBanner({ onVisible }: { onVisible?: (visible: boolean) => void }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [items, setItems] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readyImg, setReadyImg] = useState<Record<string, boolean>>({});
  const height = Math.round(width * 1.15);
  const fadeH = Math.round(height * 0.42);

  useEffect(() => {
    let alive = true;
    fetchBanners()
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    onVisible?.(loading || items.length > 0);
  }, [loading, items.length, onVisible]);

  if (loading) {
    return (
      <View style={{ width, height }}>
        <SkeletonLoader width={width} height={height} borderRadius={0} />
      </View>
    );
  }

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
    <View style={{ width, height }} collapsable={false}>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width, height }}
        keyExtractor={(item) => item.img}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
        renderItem={({ item }) => {
          const movieId = item.movieId?.find((id) => Number.isFinite(id));
          const source = resolveBannerImage(item.img);
          const ready = Boolean(readyImg[item.img]);
          return (
            <Pressable
              style={{ width, height }}
              onPress={() => {
                if (movieId) router.push(`/movie/${movieId}`);
              }}
            >
              {source ? (
                <Image
                  source={source}
                  style={{ width, height }}
                  contentFit="cover"
                  contentPosition="top"
                  onLoad={() =>
                    setReadyImg((current) => ({ ...current, [item.img]: true }))
                  }
                />
              ) : null}
              {source && !ready ? (
                <View style={styles.imageLoader} pointerEvents="none">
                  <SkeletonLoader width={width} height={height} borderRadius={0} />
                </View>
              ) : null}
              <LinearGradient
                colors={[...fadeColors]}
                locations={[0, 0.18, 0.4, 0.62, 0.82, 1]}
                style={[styles.fade, { height: fadeH }]}
                pointerEvents="none"
              />
            </Pressable>
          );
        }}
      />
      <View style={styles.dots} pointerEvents="none">
        {items.map((item, dot) => (
          <View
            key={item.img}
            style={[styles.dot, dot === index ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
