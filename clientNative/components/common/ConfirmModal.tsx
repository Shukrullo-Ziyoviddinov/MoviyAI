import { useTheme } from '@/src/stores/useThemeStore';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  const { colors, isDark } = useTheme();
  const confirmBg = danger ? '#DC2626' : colors.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.panel,
              borderColor: colors.borderSoft,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                {
                  backgroundColor: isDark
                    ? 'rgba(60, 70, 100, 0.45)'
                    : 'rgba(30, 50, 90, 0.08)',
                },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: confirmBg }]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
