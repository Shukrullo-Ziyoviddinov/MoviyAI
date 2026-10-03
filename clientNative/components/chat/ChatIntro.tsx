import {
  ChatBubbleIcon,
  GalleryIcon,
  StarIcon,
  VideoIcon,
} from '@/components/icons';
import { useComposerStore } from '@/src/stores/useComposerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const actions = [
  { key: 'text', label: "Matn bilan so'rov", Icon: ChatBubbleIcon },
  { key: 'image', label: 'Rasm bilan topish', Icon: GalleryIcon, media: 'image' as const },
  { key: 'video', label: 'Video orqali topish', Icon: VideoIcon, media: 'video' as const },
  { key: 'recommend', label: 'Tavsiya olish qidirish', Icon: StarIcon },
];

export function ChatIntro() {
  const { colors } = useTheme();
  const pickFromDevice = useComposerStore((state) => state.pickFromDevice);
  const picking = useComposerStore((state) => state.picking);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>Qanday kino izlayapsiz?</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Kino haqida yozing, rasm yuboring yoki video yuklang.
      </Text>

      <View style={styles.grid}>
        {actions.map(({ key, label, Icon, media }) => (
          <Pressable
            key={key}
            style={[
              styles.card,
              { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
              picking && media ? styles.cardDisabled : null,
            ]}
            onPress={() => {
              if (media) pickFromDevice(media);
            }}
            disabled={picking && !!media}
          >
            <Icon size={22} color={colors.accentBright} />
            <Text style={[styles.cardText, { color: colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  grid: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
});
