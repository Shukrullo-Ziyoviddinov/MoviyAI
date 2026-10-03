import { SelectedMediaStrip } from '@/components/chat/SelectedMediaStrip';
import {
  CameraIcon,
  GalleryIcon,
  MicIcon,
  SendIcon,
  VideoIcon,
} from '@/components/icons';
import { useChatStore } from '@/src/stores/useChatStore';
import { useComposerStore } from '@/src/stores/useComposerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

export function ChatComposer() {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <SelectedMediaStrip items={selectedMedia} onRemove={removeMedia} />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
              color: colors.text,
            },
          ]}
          multiline
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: colors.accent },
            !canSend && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <SendIcon size={18} color={colors.textOnAccent} />
        </Pressable>
      </View>

      <View style={styles.mediaRow}>
        <Pressable
          style={[
            styles.mediaBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            picking && styles.mediaBtnDisabled,
          ]}
          onPress={() => pickFromDevice('image')}
        >
          <GalleryIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable
          style={[
            styles.mediaBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            picking && styles.mediaBtnDisabled,
          ]}
          onPress={() => pickFromDevice('video')}
        >
          <VideoIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable
          style={[
            styles.mediaBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => undefined}
        >
          <CameraIcon size={18} color={colors.icon} />
        </Pressable>
        <Pressable
          style={[
            styles.mediaBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => undefined}
        >
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
    borderWidth: 1.5,
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
    borderWidth: 1,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
  },
  mediaBtnDisabled: {
    opacity: 0.5,
  },
});
