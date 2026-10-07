import { GuideSmsBubble } from '@/components/common/GuideSmsBubble';
import { CameraIcon, ChevronLeftIcon } from '@/components/icons';
import { dismissSearchGuide } from '@/src/api/auth';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { getSecureItem, setSecureItem } from '@/src/utils/storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SEARCH_HERO = require('../assets/images/iasearch_preview_rev_1.png');
const SEARCH_GUIDE_KEY = 'moviy-search-guide-understood';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const profile = useAuthStore((s) => s.profile);
  const setSession = useAuthStore((s) => s.setSession);
  const requireAuth = useAuthStore((s) => s.requireAuth);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = await getSecureItem(SEARCH_GUIDE_KEY);
      if (cancelled) return;
      const understood =
        local === '1' || Boolean(profile?.searchGuideUnderstood);
      setShowGuide(!understood);
      setGuideReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.searchGuideUnderstood]);

  const onGotIt = async () => {
    if (dismissing) return;
    if (!requireAuth('profile')) return;

    setDismissing(true);
    try {
      const next = await dismissSearchGuide();
      const activeToken = useAuthStore.getState().token;
      if (activeToken) await setSession(activeToken, next);
      await setSecureItem(SEARCH_GUIDE_KEY, '1');
      setShowGuide(false);
    } catch {
      // tip remains until server confirms
    } finally {
      setDismissing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.borderSoft,
          },
        ]}
      >
        <Pressable
          style={[
            styles.backBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ChevronLeftIcon size={22} color={colors.icon} />
        </Pressable>

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <Pressable
            style={styles.cameraBtn}
            onPress={() => {
              // Keyinroq: surat orqali qidiruv
            }}
            hitSlop={8}
          >
            <CameraIcon size={28} color={colors.icon} strokeWidth={2.15} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <Image
          source={SEARCH_HERO}
          style={styles.heroImage}
          contentFit="contain"
        />

        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          {t('search.aiHelper')}
        </Text>
        <Text style={[styles.headline, { color: colors.text }]}>
          {t('search.heroTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('search.heroSubtitle')}
        </Text>
      </View>

      {guideReady ? (
        <GuideSmsBubble
          visible={showGuide}
          text={t('search.guideText')}
          gotItLabel={t('search.guideGotIt')}
          onGotIt={() => void onGotIt()}
          dismissing={dismissing}
          tail="up"
          accent={colors.accent}
          textOnAccent={colors.textOnAccent}
          style={[styles.guideWrap, { top: insets.top + 64 }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 10,
    paddingRight: 8,
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingLeft: 66,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  heroImage: {
    width: 150,
    height: 150,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
