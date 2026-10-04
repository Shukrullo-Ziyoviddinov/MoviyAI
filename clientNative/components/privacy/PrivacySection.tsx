import { useTheme } from '@/src/stores/useThemeStore';
import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PrivacySectionProps = {
  title: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  iconBg?: string;
  children: ReactNode;
};

export function PrivacySection({
  title,
  Icon,
  iconColor = '#60A5FA',
  iconBg = 'rgba(37, 99, 235, 0.18)',
  children,
}: PrivacySectionProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.body, { borderTopColor: colors.borderSoft }]}>
        {children}
      </View>
    </View>
  );
}

type PrivacyBulletProps = {
  text: string;
};

export function PrivacyBullet({ text }: PrivacyBulletProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: colors.accentBright }]}>•</Text>
      <Text style={[styles.bulletText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

type PrivacySubheadingProps = {
  text: string;
};

export function PrivacySubheading({ text }: PrivacySubheadingProps) {
  const { colors } = useTheme();
  return <Text style={[styles.subheading, { color: colors.text }]}>{text}</Text>;
}

type PrivacyParagraphProps = {
  text: string;
};

export function PrivacyParagraph({ text }: PrivacyParagraphProps) {
  const { colors } = useTheme();
  return <Text style={[styles.paragraph, { color: colors.textMuted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  body: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 2,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
});
