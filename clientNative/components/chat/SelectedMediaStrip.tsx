import { colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

export type SelectedMedia = {
  id: string;
  uri: string;
  type: 'image' | 'video';
};

type SelectedMediaStripProps = {
  items: SelectedMedia[];
  onRemove: (id: string) => void;
};

export function SelectedMediaStrip({ items, onRemove }: SelectedMediaStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
          {item.type === 'video' ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>VIDEO</Text>
            </View>
          ) : null}
          <Pressable
            style={styles.removeBtn}
            onPress={() => onRemove(item.id)}
            hitSlop={8}
          >
            <Svg width={10} height={10} viewBox="0 0 10 10">
              <Line
                x1="1.5"
                y1="1.5"
                x2="8.5"
                y2="8.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <Line
                x1="8.5"
                y1="1.5"
                x2="1.5"
                y2="8.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 12,
    maxHeight: 84,
  },
  content: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
