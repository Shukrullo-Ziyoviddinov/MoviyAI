import {
  ChevronLeftIcon,
  InfoIcon,
  ShieldIcon,
} from '@/components/icons';
import {
  PrivacyBullet,
  PrivacyParagraph,
  PrivacySection,
  PrivacySubheading,
} from '@/components/privacy/PrivacySection';
import { pickLocalized } from '@/src/data/localize';
import { privacyData } from '@/src/data/privacy';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS: Record<string, ComponentType<{ size?: number; color?: string }>> = {
  shield: ShieldIcon,
  info: InfoIcon,
};

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);

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
            {pickLocalized(privacyData.page.title, language)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {pickLocalized(privacyData.page.subtitle, language)}
          </Text>
        </View>

        <View style={styles.list}>
          {privacyData.sections.map((section) => {
            const Icon = ICONS[section.icon] ?? ShieldIcon;
            return (
              <PrivacySection
                key={section.id}
                title={pickLocalized(section.title, language)}
                Icon={Icon}
                iconColor={section.iconColor}
                iconBg={section.iconBg}
              >
                {section.items.map((item) => {
                  const text = pickLocalized(item.text, language);
                  if (item.type === 'subheading') {
                    return <PrivacySubheading key={item.id} text={text} />;
                  }
                  if (item.type === 'bullet') {
                    return <PrivacyBullet key={item.id} text={text} />;
                  }
                  return <PrivacyParagraph key={item.id} text={text} />;
                })}
              </PrivacySection>
            );
          })}
        </View>
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
  list: {
    gap: 10,
    paddingHorizontal: 16,
  },
});
