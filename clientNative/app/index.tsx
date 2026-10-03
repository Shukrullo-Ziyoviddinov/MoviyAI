import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader, HEADER_ROW_HEIGHT } from '@/components/chat/ChatHeader';
import { ChatIntro } from '@/components/chat/ChatIntro';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { MediaViewer } from '@/components/chat/MediaViewer';
import { SideMenu } from '@/components/menu/SideMenu';
import { useChatStore } from '@/src/stores/useChatStore';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const AI_ROBOT = require('../assets/images/ai_preview_rev_1.png');

export default function HomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const robotSize = Math.min(width * 0.42, 180);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [composerH, setComposerH] = useState(180);
  const messages = useChatStore((state) => state.messages);
  const viewing = useMediaViewerStore((state) => !!state.item);
  const hasMessages = messages.length > 0;
  const topPad = insets.top + HEADER_ROW_HEIGHT;
  const bottomPad = composerH + 8;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SideMenu>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <View style={[styles.chatArea, { backgroundColor: colors.bg }]}>
              {hasMessages ? (
                <ChatMessageList
                  messages={messages}
                  topInset={topPad}
                  bottomInset={bottomPad}
                />
              ) : (
                <View
                  style={[
                    styles.emptyState,
                    { paddingTop: topPad, paddingBottom: bottomPad },
                  ]}
                >
                  <Image
                    source={AI_ROBOT}
                    style={{ width: robotSize, height: robotSize }}
                    contentFit="contain"
                  />
                  <View style={styles.introWrap}>
                    <ChatIntro />
                  </View>
                </View>
              )}

              <ChatHeader />

              {viewing ? <MediaViewer /> : null}

              {!viewing ? (
                <View
                  style={[
                    styles.composerOverlay,
                    { paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 10) },
                  ]}
                  onLayout={(e) => setComposerH(e.nativeEvent.layout.height)}
                  pointerEvents="box-none"
                >
                  <ChatComposer />
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </SideMenu>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  introWrap: {
    marginTop: 12,
    width: '100%',
  },
  composerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
