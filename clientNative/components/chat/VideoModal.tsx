import { VideoPlaybackBar } from '@/components/chat/VideoPlaybackBar';
import { HEADER_ROW_HEIGHT } from '@/components/chat/ChatHeader';
import type { ChatMediaItem } from '@/src/types/chat';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function fitBox(width: number, height: number, maxW: number, maxH: number) {
  const ratio = width / Math.max(height, 1);
  let displayW = Math.min(width, maxW);
  let displayH = displayW / ratio;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * ratio;
  }
  return { w: Math.max(1, Math.round(displayW)), h: Math.max(1, Math.round(displayH)) };
}

export function VideoModal() {
  const item = useMediaViewerStore((state) => state.item);
  if (!item || item.type !== 'video') return null;
  return <VideoModalPlayer key={item.uri} item={item} />;
}

function VideoModalPlayer({ item }: { item: ChatMediaItem }) {
  const { colors } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(item.uri, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.2;
  });
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const maxW = screenW * 0.92;
  const maxH = screenH - insets.top - HEADER_ROW_HEIGHT - insets.bottom - 96;
  const size =
    item.width && item.height
      ? fitBox(item.width, item.height, maxW, maxH)
      : { w: Math.round(maxW * 0.85), h: Math.round(maxH * 0.55) };

  useEffect(() => {
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      setPlaying(isPlaying);
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      setCurrent(currentTime);
      if (player.duration > 0) setDuration(player.duration);
    });
    return () => {
      playingSub.remove();
      timeSub.remove();
    };
  }, [player]);

  const onToggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (duration > 0 && current >= duration - 0.2) {
      player.replay();
      return;
    }
    player.play();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bgDeep }]}>
      <View style={styles.center}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          surfaceType="textureView"
          style={{ width: size.w, height: size.h, borderRadius: 12 }}
        />
        <View style={{ width: size.w }}>
          <VideoPlaybackBar
            playing={playing}
            current={current}
            duration={duration}
            onToggle={onToggle}
            onSeek={(time) => {
              player.currentTime = time;
              setCurrent(time);
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 25,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
});
