import {
  CameraIcon,
  GalleryIcon,
  MicIcon,
  SendIcon,
  VideoIcon,
} from '@/components/icons';
import { colors } from '@/constants/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const mediaActions = [
  { key: 'gallery', Icon: GalleryIcon },
  { key: 'video', Icon: VideoIcon },
  { key: 'camera', Icon: CameraIcon },
  { key: 'mic', Icon: MicIcon },
];

export function ChatComposer() {
  const [text, setText] = useState('');

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Xabar yozing..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={() => undefined}>
          <SendIcon size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.mediaRow}>
        {mediaActions.map(({ key, Icon }) => (
          <Pressable key={key} style={styles.mediaBtn} onPress={() => undefined}>
            <Icon size={18} color={colors.icon} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 28,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  mediaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
});
