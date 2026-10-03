import { SelectedMediaStrip } from '@/components/chat/SelectedMediaStrip';
import {
  CameraIcon,
  GalleryIcon,
  MicIcon,
  SendIcon,
  VideoIcon,
} from '@/components/icons';
import { colors } from '@/constants/theme';
import { useChatStore } from '@/src/stores/useChatStore';
import { useComposerStore } from '@/src/stores/useComposerStore';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

export function ChatComposer() {
  const sendMessage = useChatStore((state) => state.sendMessage);
  const selectedMedia = useComposerStore((state) => state.selectedMedia);
  const picking = useComposerStore((state) => state.picking);
  const pickFromDevice = useComposerStore((state) => state.pickFromDevice);
  const removeMedia = useComposerStore((state) => state.removeMedia);
  const clearMedia = useComposerStore((state) => state.clearMedia);
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0 || selectedMedia.length > 0;

  const handleSend = () => {
    if (!canSend) return;

    sendMessage({
      text,
      media: selectedMedia,
    });

    setText('');
    clearMedia();
  };

  return (
    <View style={styles.wrap}>
      <SelectedMediaStrip items={selectedMedia} onRemove={removeMedia} />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Xabar yozing..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <SendIcon size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.mediaRow}>
        <Pressable
          style={[styles.mediaBtn, picking && styles.mediaBtnDisabled]}
          onPress={() => pickFromDevice('image')}
        >
          <GalleryIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable
          style={[styles.mediaBtn, picking && styles.mediaBtnDisabled]}
          onPress={() => pickFromDevice('video')}
        >
          <VideoIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable style={styles.mediaBtn} onPress={() => undefined}>
          <CameraIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable style={styles.mediaBtn} onPress={() => undefined}>
          <MicIcon size={18} color={colors.icon} />
        </Pressable>
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
  sendBtnDisabled: {
    opacity: 0.45,
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
  mediaBtnDisabled: {
    opacity: 0.5,
  },
});
