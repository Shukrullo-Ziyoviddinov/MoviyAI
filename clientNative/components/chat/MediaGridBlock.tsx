import type { ChatMediaItem } from '@/src/types/chat';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type MediaGridBlockProps = {
  items: ChatMediaItem[];
};

const GAP = 3;
const MEDIA_MAX_W = 360;
const VIDEO_MAX_H = 460;
const IMAGE_MAX_H = 280;

function fitBox(width: number, height: number, maxW: number, maxH: number) {
  const ratio = width / Math.max(height, 1);
  let displayW = Math.min(width, maxW);
  let displayH = displayW / ratio;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * ratio;
  }
  if (displayW > maxW) {
    displayW = maxW;
    displayH = displayW / ratio;
  }
  return { w: Math.max(1, Math.round(displayW)), h: Math.max(1, Math.round(displayH)) };
}

function MediaCell({
  item,
  style,
}: {
  item: ChatMediaItem;
  style?: object;
}) {
  const open = useMediaViewerStore((state) => state.open);

  return (
    <Pressable
      style={[styles.cell, style]}
      onPress={() => open(item)}
    >
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {item.type === 'video' ? (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>VIDEO</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SingleMedia({ item }: { item: ChatMediaItem }) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const maxW = Math.min(screenW * 0.72, MEDIA_MAX_W);
  const maxH = item.type === 'video' ? VIDEO_MAX_H : IMAGE_MAX_H;
  const [size, setSize] = useState({ w: Math.round(maxW * 0.7), h: 180 });

  useEffect(() => {
    if (item.width && item.height) {
      setSize(fitBox(item.width, item.height, maxW, maxH));
      return;
    }
    if (item.type === 'video') return;
    RNImage.getSize(
      item.uri,
      (w, h) => setSize(fitBox(w, h, maxW, maxH)),
      () => setSize({ w: Math.round(maxW * 0.7), h: 180 })
    );
  }, [item.height, item.type, item.uri, item.width, maxH, maxW]);

  return (
    <View
      style={[
        styles.singleWrap,
        { width: size.w, height: size.h, backgroundColor: colors.panelSoft },
      ]}
    >
      <MediaCell item={item} style={styles.flex} />
    </View>
  );
}

export function MediaGridBlock({ items }: MediaGridBlockProps) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const blockW = Math.min(screenW * 0.78, 320);

  if (items.length === 1 || items.every((item) => item.type === 'video')) {
    return (
      <View style={styles.row}>
        <View style={styles.videoStack}>
          {items.map((item) => (
            <SingleMedia key={item.id} item={item} />
          ))}
        </View>
      </View>
    );
  }

  if (items.length === 2) {
    const cellW = (blockW - GAP) / 2;
    const cellH = 168;
    return (
      <View style={styles.row}>
        <View
          style={[
            styles.block,
            { width: blockW, height: cellH, backgroundColor: colors.panelSoft },
          ]}
        >
          <View style={styles.rowFlex}>
            <MediaCell item={items[0]} style={{ width: cellW, height: cellH }} />
            <View style={{ width: GAP }} />
            <MediaCell item={items[1]} style={{ width: cellW, height: cellH }} />
          </View>
        </View>
      </View>
    );
  }

  if (items.length === 3) {
    return (
      <View style={styles.row}>
        <View
          style={[
            styles.block,
            { width: blockW, height: 220, backgroundColor: colors.panelSoft },
          ]}
        >
          <View style={styles.rowFlex}>
            <MediaCell item={items[0]} style={{ flex: 1.05 }} />
            <View style={{ width: GAP }} />
            <View style={{ flex: 0.95, gap: GAP }}>
              <MediaCell item={items[1]} style={{ flex: 1 }} />
              <MediaCell item={items[2]} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  const cell = (blockW - GAP) / 2;
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.block,
          {
            width: blockW,
            height: cell * 2 + GAP,
            backgroundColor: colors.panelSoft,
          },
        ]}
      >
        <View style={styles.grid4}>
          <MediaCell item={items[0]} style={{ width: cell, height: cell }} />
          <MediaCell item={items[1]} style={{ width: cell, height: cell }} />
          <MediaCell item={items[2]} style={{ width: cell, height: cell }} />
          <MediaCell item={items[3]} style={{ width: cell, height: cell }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  block: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  singleWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rowFlex: {
    flex: 1,
    flexDirection: 'row',
  },
  grid4: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: {
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  flex: {
    flex: 1,
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
