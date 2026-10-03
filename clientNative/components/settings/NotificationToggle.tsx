import { colors } from '@/constants/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type NotificationToggleProps = {
  initialOn?: boolean;
};

/** Faqat UI toggle. Bildirishnoma logikasi keyin ulanadi. */
export function NotificationToggle({ initialOn = true }: NotificationToggleProps) {
  const [on, setOn] = useState(initialOn);

  return (
    <Pressable
      style={[styles.track, on ? styles.trackOn : styles.trackOff]}
      onPress={() => setOn((v) => !v)}
      hitSlop={6}
    >
      <View style={[styles.thumb, on ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trackOn: {
    backgroundColor: 'rgba(91, 75, 255, 0.85)',
    alignItems: 'flex-end',
  },
  trackOff: {
    backgroundColor: 'rgba(60, 70, 100, 0.55)',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  thumbOn: {
    backgroundColor: '#F3F0FF',
  },
  thumbOff: {
    backgroundColor: colors.textMuted,
  },
});
