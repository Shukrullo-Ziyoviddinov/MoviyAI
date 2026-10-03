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
      onPress={() => {
        if (item.type === 'image') open(item);
      }}
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
  const maxW = screenW * 0.72;
  const maxH = 280;
  const [size, setSize] = useState({ w: maxW * 0.7, h: 180 });

  useEffect(() => {
    RNImage.getSize(
      item.uri,
      (w, h) => {
        const ratio = w / h;
        let displayW = maxW;
        let displayH = displayW / ratio;

        if (displayH > maxH) {
          displayH = maxH;
          displayW = displayH * ratio;
        }

        if (displayW > maxW) {
          displayW = maxW;
          displayH = displayW / ratio;
        }

        setSize({ w: displayW, h: displayH });
      },
      () => setSize({ w: maxW * 0.7, h: 180 })
    );
  }, [item.uri, maxH, maxW]);

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

  if (items.length === 1) {
    return (
      <View style={styles.row}>
        <SingleMedia item={items[0]} />
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
