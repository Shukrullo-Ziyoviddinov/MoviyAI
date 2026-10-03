import { MoonIcon, SunIcon } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type ThemeToggleProps = {
  initialDark?: boolean;
};

/** Faqat UI: oy <-> quyosh. Tema o'zgarishi keyin ulanadi. */
export function ThemeToggle({ initialDark = true }: ThemeToggleProps) {
  const [dark, setDark] = useState(initialDark);

  return (
    <Pressable
      style={[styles.track, dark ? styles.trackDark : styles.trackLight]}
      onPress={() => setDark((v) => !v)}
      hitSlop={6}
    >
      <View style={[styles.thumb, dark ? styles.thumbDark : styles.thumbLight]}>
        {dark ? (
          <MoonIcon size={14} color="#E8E4FF" />
        ) : (
          <SunIcon size={14} color="#F59E0B" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trackDark: {
    backgroundColor: 'rgba(91, 75, 255, 0.45)',
    alignItems: 'flex-end',
  },
  trackLight: {
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDark: {
    backgroundColor: '#3B2F8A',
  },
  thumbLight: {
    backgroundColor: '#FEF3C7',
  },
});
