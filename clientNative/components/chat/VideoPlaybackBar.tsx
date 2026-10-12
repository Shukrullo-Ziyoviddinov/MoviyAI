import { useTheme } from '@/src/stores/useThemeStore';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type VideoPlaybackBarProps = {
  playing: boolean;
  current: number;
  duration: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
};

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function VideoPlaybackBar({
  playing,
  current,
  duration,
  onToggle,
  onSeek,
}: VideoPlaybackBarProps) {
  const { colors } = useTheme();
  const [trackW, setTrackW] = useState(1);
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.play, { backgroundColor: colors.accent }]}
        onPress={onToggle}
        hitSlop={8}
      >
        {playing ? (
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Rect x="2" y="1.5" width="3.2" height="11" rx="1" fill={colors.textOnAccent} />
            <Rect x="8.8" y="1.5" width="3.2" height="11" rx="1" fill={colors.textOnAccent} />
          </Svg>
        ) : (
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path d="M3.2 1.8L12 7L3.2 12.2V1.8Z" fill={colors.textOnAccent} />
          </Svg>
        )}
      </Pressable>

      <Pressable
        style={styles.trackHit}
        onLayout={(event) => setTrackW(event.nativeEvent.layout.width)}
        onPress={(event) => {
          if (duration <= 0) return;
          const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackW));
          onSeek(ratio * duration);
        }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
          <View
            style={[
              styles.thumb,
              { backgroundColor: colors.textOnAccent, left: Math.max(0, progress * trackW - 6) },
            ]}
          />
        </View>
      </Pressable>

      <Text style={[styles.time, { color: colors.text }]}>
        {formatTime(current)} / {formatTime(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackHit: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -4,
  },
  time: {
    minWidth: 78,
    fontSize: 12,
    fontWeight: '600',
  },
});
