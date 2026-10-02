import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatIntro } from '@/components/chat/ChatIntro';
import { colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const robotSize = Math.min(width * 0.42, 180);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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
    <LinearGradient
      colors={[colors.bgDeep, colors.bg, '#04060D']}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <ChatHeader />

          <View style={styles.chatArea}>
            <Image
              source={AI_ROBOT}
              style={{ width: robotSize, height: robotSize }}
              contentFit="contain"
            />
            <View style={styles.introWrap}>
              <ChatIntro />
            </View>
          </View>

          <View
            style={[
              styles.composerWrap,
              { paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 10) },
            ]}
          >
            <ChatComposer />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  introWrap: {
    marginTop: 10,
    width: '100%',
  },
  composerWrap: {
    backgroundColor: 'transparent',
  },
});
