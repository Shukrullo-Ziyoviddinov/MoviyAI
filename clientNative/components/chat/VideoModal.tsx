import {videoHtml} from './video-html';
import { VideoPlaybackBar } from '@/components/chat/VideoPlaybackBar';
import { HEADER_ROW_HEIGHT } from '@/components/chat/ChatHeader';
import type { ChatMediaItem } from '@/src/types/chat';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import {videoPageLocation} from './video-page';

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

function inlinePage(uri: string) {
  const {source,dir}=videoPageLocation(uri);
  return { html: videoHtml(source), dir };
}

async function prepareVideoPage(uri: string) {
  if(/^https:\/\//i.test(uri))return inlinePage(uri);
  const { File } = await import('expo-file-system');
  const video = new File(uri);
  const htmlFile = new File(video.parentDirectory, 'moviy-player.html');
  if (htmlFile.exists) htmlFile.delete();
  htmlFile.create();
  htmlFile.write(videoHtml(encodeURI(video.name)));
  const folder = video.parentDirectory.uri;
  return { uri: htmlFile.uri, dir: folder.endsWith('/') ? folder : `${folder}/` };
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
  const webRef = useRef<WebView>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [page, setPage] = useState<{ uri?: string; html?: string; dir: string }>(() => inlinePage(item.uri));

  useEffect(() => {
    let cancelled = false;
    prepareVideoPage(item.uri)
      .then((next) => {
        if (!cancelled) setPage(next);
      })
      .catch(() => {
        if (!cancelled) setPage(inlinePage(item.uri));
      });
    return () => {
      cancelled = true;
    };
  }, [item.uri]);

  const maxW = screenW * 0.92;
  const maxH = screenH - insets.top - HEADER_ROW_HEIGHT - insets.bottom - 96;
  const size =
    item.width && item.height
      ? fitBox(item.width, item.height, maxW, maxH)
      : { w: Math.round(maxW * 0.85), h: Math.round(maxH * 0.55) };

  const send = (payload: { t: string; c?: number }) => {
    webRef.current?.postMessage(JSON.stringify(payload));
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        t?: string;
        c?: number;
        d?: number;
        v?: boolean;
      };
      if ((msg.t === 'time' || msg.t === 'meta' || msg.t === 'play') && typeof msg.d === 'number' && msg.d > 0) {
        setDuration(msg.d);
      }
      if ((msg.t === 'time' || msg.t === 'play') && typeof msg.c === 'number') {
        setCurrent(msg.c);
      }
      if (msg.t === 'play') setPlaying(Boolean(msg.v));
    } catch {
      // ignore malformed player messages
    }
  };

  const onToggle = () => {
    if (playing) {
      send({ t: 'pause' });
      return;
    }
    if (duration > 0 && current >= duration - 0.2) {
      send({ t: 'replay' });
      return;
    }
    send({ t: 'play' });
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bgDeep }]}>
      <View style={styles.center}>
        <View
          style={{
            width: size.w,
            height: size.h,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#000',
          }}
        >
          {page ? (
            <WebView
              ref={webRef}
              source={page.uri ? { uri: page.uri } : { html: page.html ?? '', baseUrl: page.dir }}
              style={{ width: size.w, height: size.h, opacity: 0.99, backgroundColor: '#000' }}
              originWhitelist={['*']}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              allowingReadAccessToURL={page.dir}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              cacheMode="LOAD_NO_CACHE"
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={() => true}
              onMessage={onMessage}
            />
          ) : null}
        </View>
        <View style={{ width: size.w }}>
          <VideoPlaybackBar
            playing={playing}
            current={current}
            duration={duration}
            onToggle={onToggle}
            onSeek={(time) => {
              send({ t: 'seek', c: time });
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
