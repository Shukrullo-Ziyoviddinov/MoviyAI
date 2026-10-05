import { PersonIcon, SendIcon } from '@/components/icons';
import { createMovieComment } from '@/src/api/movies';
import { useTheme } from '@/src/stores/useThemeStore';
import type { MovieComment } from '@/src/types/movie';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPEN_MS = 320;
const CLOSE_MS = 240;

type CommentModalProps = {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  comments: MovieComment[];
  onCommentsChange: (comments: MovieComment[], commentCount: number) => void;
};

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function userLabel(userId: string) {
  const tail = userId.replace(/^user_/, '').slice(-4);
  return tail ? `User ${tail}` : 'User';
}

export function CommentModal({
  visible,
  onClose,
  movieId,
  comments,
  onCommentsChange,
}: CommentModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const bottomPad = Math.max(insets.bottom, 12);
  const sheetH = Math.min(height * 0.86, height - insets.top - 24);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(sheetH);
  const [mounted, setMounted] = useState(false);
  const skipCloseAnim = useRef(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    sheetHeightSV.value = sheetH;
  }, [sheetH, sheetHeightSV]);

  useEffect(() => {
    if (visible) {
      skipCloseAnim.current = false;
      setMounted(true);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      const timer = setTimeout(() => inputRef.current?.focus(), 360);
      return () => clearTimeout(timer);
    }

    if (!mounted || skipCloseAnim.current) {
      skipCloseAnim.current = false;
      return;
    }

    const current = (1 - progress.value) * sheetHeightSV.value + dragY.value;
    progress.value = 1;
    dragY.value = current;
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          progress.value = 0;
          dragY.value = 0;
          runOnJS(setMounted)(false);
        }
      }
    );
  }, [visible, progress, dragY, mounted, sheetHeightSV]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setSending(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const finishClose = () => {
    progress.value = 0;
    dragY.value = 0;
    skipCloseAnim.current = true;
    onClose();
    setMounted(false);
  };

  const snapClose = () => {
    'worklet';
    const remaining = Math.max(0, sheetHeightSV.value - dragY.value);
    const duration = Math.max(
      140,
      Math.min(CLOSE_MS, (remaining / sheetHeightSV.value) * CLOSE_MS)
    );
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const threshold = sheetHeightSV.value * 0.2;
      if (dragY.value > threshold || e.velocityY > 800) {
        snapClose();
      } else {
        dragY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      0.55 *
      Math.max(0, 1 - dragY.value / (sheetHeightSV.value + 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - progress.value) * sheetHeightSV.value + dragY.value,
      },
    ],
  }));

  const canSend = text.trim().length > 0 && !sending;

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending || !Number.isFinite(movieId)) return;
    setSending(true);
    try {
      const result = await createMovieComment(movieId, value);
      onCommentsChange(
        [result.comment, ...comments.filter((c) => c.id !== result.comment.id)],
        result.commentCount
      );
      setText('');
    } catch {
      // keep draft text on failure
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetH,
            backgroundColor: colors.panel,
            borderColor: colors.borderSoft,
          },
          sheetStyle,
        ]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.dragZone}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.title, { color: colors.text }]}>
                {t('movie.commentsTitle')}
              </Text>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {t('movie.noComments')}
              </Text>
            ) : (
              comments.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.commentRow,
                    { borderBottomColor: colors.borderSoft },
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <PersonIcon size={16} color={colors.icon} />
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {userLabel(item.userId)}
                      </Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>
                        {formatCommentTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View
            style={[
              styles.composer,
              {
                paddingBottom: bottomPad,
                borderTopColor: colors.borderSoft,
                backgroundColor: colors.panel,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t('movie.commentPlaceholder')}
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
              maxLength={500}
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
              {sending ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <SendIcon size={18} color={colors.textOnAccent} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 120,
    justifyContent: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  dragZone: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexGrow: 1,
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
