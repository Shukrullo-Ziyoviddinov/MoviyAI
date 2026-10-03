import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileMenuCard } from '@/components/profile/ProfileMenuCard';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader onSettingsPress={() => router.push('/settings')} />

        <View style={styles.menuWrap}>
          <ProfileMenuCard onSettings={() => router.push('/settings')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  menuWrap: {
    marginTop: 28,
  },
});
