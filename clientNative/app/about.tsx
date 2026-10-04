import {
  AboutAccordionItem,
  AboutAccordionList,
} from '@/components/about/AboutAccordionItem';
import {
  ChatBubbleIcon,
  ChevronLeftIcon,
  FilmIcon,
  GalleryIcon,
  SearchIcon,
  StarIcon,
  VideoIcon,
} from '@/components/icons';
import { fetchAbout } from '@/src/api/about';
import type { AboutData } from '@/src/data/about';
import { pickLocalized } from '@/src/data/localize';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS: Record<string, ComponentType<{ size?: number; color?: string }>> = {
  film: FilmIcon,
  search: SearchIcon,
  gallery: GalleryIcon,
  video: VideoIcon,
  chat: ChatBubbleIcon,
  star: StarIcon,
};

export default function AboutScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const [data, setData] = useState<AboutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAbout()
      .then((doc) => {
        if (!alive) return;
        setData(doc);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Load failed');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={[
              styles.backBtn,
              { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            ]}
            onPress={() => router.back()}
          >
            <ChevronLeftIcon size={20} color={colors.icon} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {data
              ? pickLocalized(data.page.title, language)
              : pickLocalized(
                  { uz: 'Ilova haqida', ru: 'О приложении', en: 'About the app' },
                  language
                )}
          </Text>
          {data ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {pickLocalized(data.page.subtitle, language)}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.accentBright} />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>{error}</Text>
          </View>
        ) : data ? (
          <AboutAccordionList>
            {data.sections.map((section) => {
              const Icon = ICONS[section.icon] ?? FilmIcon;
              return (
                <AboutAccordionItem
                  key={section.id}
                  title={pickLocalized(section.title, language)}
                  body={pickLocalized(section.body, language)}
                  Icon={Icon}
                  iconColor={section.iconColor}
                  iconBg={section.iconBg}
                  defaultOpen={section.defaultOpen}
                />
              );
            })}
          </AboutAccordionList>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  stateWrap: {
    paddingHorizontal: 18,
    paddingTop: 24,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
