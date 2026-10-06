import { CloseIcon, PersonIcon, SendIcon } from '@/components/icons';
import { createMovieComment, fetchCommentReplies } from '@/src/api/movies';
import { useTheme } from '@/src/stores/useThemeStore';
import type { MovieComment } from '@/src/types/movie';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
const SNAP_MS = 280;
const BOTTOM_EXTRA = 18;
/** Extra gap so input clears keyboard fully. */
const KEYBOARD_EXTRA = 24;

/** Open (no keyboard). */
const OPEN_RATIO = 0.58;
/** Keyboard open — leaves a gap at the top. */
const KEYBOARD_RATIO = 0.85;

type CommentModalProps = {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  comments: MovieComment[];
  onCommentsChange: (comments: MovieComment[], commentCount?: number) => void;
  /** Open modal already targeting this top-level comment for reply. */
  replyToId?: string | null;
  onReplyToIdConsumed?: () => void;
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

function mentionLabel(userId: string) {
  return `@${userLabel(userId)}`;
}

function getScreenHeight() {
  return Dimensions.get('screen').height;
}

export function CommentModal({
  visible,
  onClose,
  movieId,
  comments,
  onCommentsChange,
  replyToId = null,
  onReplyToIdConsumed,
}: CommentModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const safeBottom = Math.max(insets.bottom + BOTTOM_EXTRA, 28);
  // True device screen — covers status bar / cutout gap that window height misses.
  const screenH = Math.max(windowH, getScreenHeight());

  const openH = Math.round(windowH * OPEN_RATIO);
  const keyboardHSheet = Math.round(windowH * KEYBOARD_RATIO);
  const fullH = screenH;

  const progress = useSharedValue(0);
  const expanded = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetH = useSharedValue(openH);
  const collapsedHSV = useSharedValue(openH);
  const fullHSV = useSharedValue(fullH);
  const composerPadSV = useSharedValue(safeBottom);

  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const skipCloseAnim = useRef(false);
  const keyboardClosing = useRef(false);
  const keyboardOpening = useRef(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardH, setKeyboardH] = useState(0);
  const [replyTo, setReplyTo] = useState<MovieComment | null>(null);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);

  const collapsedH = keyboardOpen ? keyboardHSheet : openH;

  useEffect(() => {
    collapsedHSV.value = collapsedH;
    fullHSV.value = fullH;
  }, [collapsedH, fullH, collapsedHSV, fullHSV]);

  useEffect(() => {
    if (visible) {
      skipCloseAnim.current = false;
      keyboardClosing.current = false;
      keyboardOpening.current = false;
      setMounted(true);
      setIsExpanded(false);
      setKeyboardOpen(false);
      setKeyboardH(0);
      composerPadSV.value = safeBottom;
      expanded.value = 0;
      dragY.value = 0;
      sheetH.value = openH;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      const timer = setTimeout(() => inputRef.current?.focus(), 450);
      return () => clearTimeout(timer);
    }

    if (!mounted || skipCloseAnim.current) {
      skipCloseAnim.current = false;
      return;
    }

    const current = (1 - progress.value) * sheetH.value + dragY.value;
    progress.value = 1;
    dragY.value = current;
    dragY.value = withTiming(
      sheetH.value,
      { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          progress.value = 0;
          dragY.value = 0;
          expanded.value = 0;
          runOnJS(setMounted)(false);
          runOnJS(setIsExpanded)(false);
        }
      }
    );
  }, [visible, progress, dragY, mounted, sheetH, expanded, openH, composerPadSV, safeBottom]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setSending(false);
      setKeyboardOpen(false);
      setKeyboardH(0);
      composerPadSV.value = safeBottom;
      setIsExpanded(false);
      setReplyTo(null);
      setLoadingMoreId(null);
      keyboardClosing.current = false;
      keyboardOpening.current = false;
    }
  }, [visible, composerPadSV, safeBottom]);

  useEffect(() => {
    if (!visible || !replyToId) return;
    const target = comments.find((c) => c.id === replyToId) ?? null;
    if (target) {
      setReplyTo(target);
      const timer = setTimeout(() => inputRef.current?.focus(), 420);
      onReplyToIdConsumed?.();
      return () => clearTimeout(timer);
    }
    onReplyToIdConsumed?.();
  }, [visible, replyToId, comments, onReplyToIdConsumed]);

  useEffect(() => {
    if (!visible) return;

    const kbDuration = (e: { duration?: number }) => {
      const d = e.duration;
      if (typeof d === 'number' && d > 0) return d;
      return Platform.OS === 'ios' ? 250 : 180;
    };

    const onShow = (e: {
      duration?: number;
      endCoordinates: { height: number; screenY: number };
    }) => {
      if (keyboardOpening.current) return;
      keyboardOpening.current = true;
      keyboardClosing.current = false;
      const fromBottom = Math.max(
        0,
        screenH - e.endCoordinates.screenY,
        e.endCoordinates.height
      );
      const duration = kbDuration(e);
      setKeyboardOpen(true);
      setKeyboardH(fromBottom);
      composerPadSV.value = withTiming(fromBottom + KEYBOARD_EXTRA, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      collapsedHSV.value = keyboardHSheet;
      if (expanded.value < 0.5) {
        sheetH.value = withTiming(keyboardHSheet, {
          duration,
          easing: Easing.out(Easing.cubic),
        });
      }
    };

    const onHide = (e: { duration?: number }) => {
      if (keyboardClosing.current) return;
      keyboardClosing.current = true;
      keyboardOpening.current = false;
      const duration = kbDuration(e);
      setKeyboardOpen(false);
      setKeyboardH(0);
      // Fall together with the keyboard (same duration).
      composerPadSV.value = withTiming(safeBottom, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      collapsedHSV.value = openH;
      if (expanded.value < 0.5) {
        sheetH.value = withTiming(openH, {
          duration,
          easing: Easing.out(Easing.cubic),
        });
      }
    };

    const showSubs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
    ];
    const hideSubs = [
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];

    return () => {
      showSubs.forEach((s) => s.remove());
      hideSubs.forEach((s) => s.remove());
    };
  }, [
    visible,
    screenH,
    keyboardHSheet,
    openH,
    safeBottom,
    composerPadSV,
    collapsedHSV,
    sheetH,
    expanded,
  ]);

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
    expanded.value = 0;
    skipCloseAnim.current = true;
    onClose();
    setMounted(false);
    setIsExpanded(false);
  };

  const snapToCollapsed = () => {
    'worklet';
    expanded.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    sheetH.value = withTiming(collapsedHSV.value, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    dragY.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    runOnJS(setIsExpanded)(false);
  };

  const snapToFull = () => {
    'worklet';
    expanded.value = withTiming(1, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    sheetH.value = withTiming(fullHSV.value, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    dragY.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    runOnJS(setIsExpanded)(true);
  };

  const snapClose = () => {
    'worklet';
    const remaining = Math.max(0, sheetH.value - dragY.value);
    const duration = Math.max(
      140,
      Math.min(CLOSE_MS, (remaining / Math.max(sheetH.value, 1)) * CLOSE_MS)
    );
    dragY.value = withTiming(
      sheetH.value,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      const isFull = expanded.value > 0.5;
      const collapsed = collapsedHSV.value;
      const full = fullHSV.value;

      if (isFull) {
        sheetH.value = Math.min(
          full,
          Math.max(collapsed, full - Math.max(0, e.translationY))
        );
        dragY.value = 0;
        return;
      }

      if (e.translationY < 0) {
        const travel = full - collapsed;
        sheetH.value = Math.min(
          full,
          collapsed + Math.min(travel, -e.translationY * 1.35)
        );
        dragY.value = 0;
      } else {
        sheetH.value = collapsed;
        dragY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      const isFull = expanded.value > 0.5;
      const collapsed = collapsedHSV.value;
      const full = fullHSV.value;
      const travel = Math.max(1, full - collapsed);

      if (isFull) {
        if (sheetH.value < collapsed + travel * 0.55 || e.velocityY > 700) {
          snapToCollapsed();
        } else {
          snapToFull();
        }
        return;
      }

      // Easier expand: small upward drag snaps to full screen.
      if (sheetH.value > collapsed + travel * 0.18 || e.velocityY < -500) {
        snapToFull();
        return;
      }
      if (dragY.value > collapsed * 0.16 || e.velocityY > 800) {
        snapClose();
        return;
      }
      snapToCollapsed();
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      0.55 *
      Math.max(0, 1 - dragY.value / (sheetH.value + 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetH.value,
    transform: [
      {
        translateY: (1 - progress.value) * sheetH.value + dragY.value,
      },
    ],
  }));

  const composerAnimStyle = useAnimatedStyle(() => ({
    paddingBottom: composerPadSV.value,
  }));

  const canSend = text.trim().length > 0 && !sending;

  const startReply = (item: MovieComment) => {
    setReplyTo(item);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const loadMoreReplies = async (parent: MovieComment) => {
    if (loadingMoreId || !Number.isFinite(movieId)) return;
    setLoadingMoreId(parent.id);
    try {
      const skip = parent.replies?.length ?? 0;
      const result = await fetchCommentReplies(movieId, parent.id, skip, 5);
      const existing = parent.replies ?? [];
      const merged = [
        ...existing,
        ...result.replies.filter((r) => !existing.some((e) => e.id === r.id)),
      ];
      onCommentsChange(
        comments.map((c) =>
          c.id === parent.id
            ? { ...c, replies: merged, replyCount: result.replyCount }
            : c
        )
      );
    } catch {
      // ignore
    } finally {
      setLoadingMoreId(null);
    }
  };

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending || !Number.isFinite(movieId)) return;
    setSending(true);
    try {
      const parentId = replyTo?.id ?? null;
      const result = await createMovieComment(movieId, value, parentId);
      if (result.comment.parentId) {
        const pid = result.comment.parentId;
        onCommentsChange(
          comments.map((c) => {
            if (c.id !== pid) return c;
            const replies = [...(c.replies ?? []), result.comment];
            return {
              ...c,
              replies,
              replyCount: Math.max(c.replyCount ?? 0, replies.length),
            };
          }),
          result.commentCount
        );
      } else {
        onCommentsChange(
          [
            { ...result.comment, replyCount: 0, replies: [] },
            ...comments.filter((c) => c.id !== result.comment.id),
          ],
          result.commentCount
        );
      }
      setText('');
      setReplyTo(null);
    } catch {
      // keep draft text on failure
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
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
                backgroundColor: colors.panel,
                borderColor: colors.borderSoft,
                borderTopLeftRadius: isExpanded ? 0 : 22,
                borderTopRightRadius: isExpanded ? 0 : 22,
                borderTopWidth: isExpanded ? 0 : 1,
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <Animated.View style={styles.dragZone}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('movie.commentsTitle')}
                </Text>
              </Animated.View>
            </GestureDetector>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {t('movie.noComments')}
              </Text>
            ) : (
              comments.map((item) => {
                const replies = item.replies ?? [];
                const replyCount = item.replyCount ?? replies.length;
                const hasMore = replies.length < replyCount;

                return (
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
                      <PersonIcon size={22} color={colors.icon} />
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
                      <View style={styles.commentTextBlock}>
                        <Text style={[styles.commentText, { color: colors.text }]}>
                          {item.text}
                        </Text>

                        <Pressable
                          onPress={() => startReply(item)}
                          hitSlop={6}
                          style={styles.replyBtn}
                        >
                          <Text
                            style={[styles.replyText, { color: colors.accentBright }]}
                          >
                            {t('movie.reply')}
                          </Text>
                        </Pressable>
                      </View>

                      {replies.length > 0 ? (
                        <View style={styles.repliesBlock}>
                          {replies.map((reply) => (
                            <View key={reply.id} style={styles.replyRow}>
                              <View
                                style={[
                                  styles.replyAvatar,
                                  {
                                    backgroundColor: colors.panelSoft,
                                    borderColor: colors.borderSoft,
                                  },
                                ]}
                              >
                                <PersonIcon size={16} color={colors.icon} />
                              </View>
                              <View style={styles.replyBody}>
                                <View style={styles.commentMeta}>
                                  <Text
                                    style={[
                                      styles.replyUser,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {userLabel(reply.userId)}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.time,
                                      { color: colors.textMuted },
                                    ]}
                                  >
                                    {formatCommentTime(reply.createdAt)}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.replyTextBody,
                                    { color: colors.text },
                                  ]}
                                >
                                  {reply.replyToUserId ? (
                                    <>
                                      <Text
                                        style={{
                                          color: colors.accentBright,
                                          fontWeight: '700',
                                        }}
                                      >
                                        {mentionLabel(reply.replyToUserId)}{' '}
                                      </Text>
                                      {reply.text}
                                    </>
                                  ) : (
                                    reply.text
                                  )}
                                </Text>
                                <Pressable
                                  onPress={() => startReply(reply)}
                                  hitSlop={6}
                                  style={styles.replyBtn}
                                >
                                  <Text
                                    style={[
                                      styles.replyText,
                                      { color: colors.accentBright },
                                    ]}
                                  >
                                    {t('movie.reply')}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}

                          {hasMore ? (
                            <Pressable
                              onPress={() => loadMoreReplies(item)}
                              hitSlop={6}
                              disabled={loadingMoreId === item.id}
                              style={styles.moreRepliesBtn}
                            >
                              {loadingMoreId === item.id ? (
                                <ActivityIndicator
                                  size="small"
                                  color={colors.accentBright}
                                />
                              ) : (
                                <Text
                                  style={[
                                    styles.moreReplies,
                                    { color: colors.accentBright },
                                  ]}
                                >
                                  {t('movie.moreReplies')}
                                </Text>
                              )}
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <Animated.View
            style={[
              styles.composer,
              {
                borderTopColor: colors.borderSoft,
                backgroundColor: colors.panel,
              },
              composerAnimStyle,
            ]}
          >
            {replyTo ? (
              <View style={styles.replyBar}>
                <Text
                  style={[styles.replyBarText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {t('movie.replyingTo', { user: userLabel(replyTo.userId) })}
                </Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <CloseIcon size={16} color={colors.icon} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composerRow}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={
                  replyTo
                    ? t('movie.reply')
                    : t('movie.commentPlaceholder')
                }
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
          </Animated.View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    overflow: 'hidden',
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dragZone: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
    textAlign: 'center',
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  commentTextBlock: {
    gap: 2,
    width: '100%',
  },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  replyBarText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
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
  replyBtn: {
    alignSelf: 'flex-start',
    marginTop: 0,
    paddingVertical: 0,
  },
  replyText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  repliesBlock: {
    marginTop: 10,
    gap: 10,
    paddingLeft: 4,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  replyBody: {
    flex: 1,
    gap: 2,
  },
  replyUser: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyTextBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  moreRepliesBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    minHeight: 22,
    justifyContent: 'center',
  },
  moreReplies: {
    fontSize: 13,
    fontWeight: '700',
  },
});
