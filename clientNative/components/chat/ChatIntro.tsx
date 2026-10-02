import {
  ChatBubbleIcon,
  GalleryIcon,
  StarIcon,
  VideoIcon,
} from '@/components/icons';
import { colors } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const actions = [
  { key: 'text', label: "Matn bilan so'rov", Icon: ChatBubbleIcon },
  { key: 'image', label: 'Rasm bilan topish', Icon: GalleryIcon },
  { key: 'video', label: 'Video orqali topish', Icon: VideoIcon },
  { key: 'recommend', label: 'Tavsiya olish', Icon: StarIcon },
];

export function ChatIntro() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Qanday kino izlayapsiz?</Text>
      <Text style={styles.subtitle}>
        Kino haqida yozing, rasm yuboring yoki video yuklang.
      </Text>

      <View style={styles.grid}>
        {actions.map(({ key, label, Icon }) => (
          <Pressable key={key} style={styles.card} onPress={() => undefined}>
            <Icon size={22} color="#A5B4FC" />
            <Text style={styles.cardText}>{label}</Text>
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
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: colors.textMuted,
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
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
});
