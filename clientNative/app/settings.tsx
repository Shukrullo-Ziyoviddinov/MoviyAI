import { SettingsGeneralCard } from '@/components/settings/SettingsGeneralCard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsLogoutButton } from '@/components/settings/SettingsLogoutButton';
import { SettingsProfileCard } from '@/components/settings/SettingsProfileCard';
import { SettingsSavedCard } from '@/components/settings/SettingsSavedCard';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsHeader />

        <View style={styles.block}>
          <SettingsProfileCard
            name={profile?.name}
            email={profile?.email}
            picture={profile?.picture}
            onPress={() => router.push('/profile')}
          />
        </View>

        <View style={styles.block}>
          <SettingsSavedCard />
        </View>

        <View style={styles.block}>
          <SettingsGeneralCard
            onPrivacy={() => router.push('/privacy')}
            onData={() => router.push('/data-manage')}
            onAbout={() => router.push('/about')}
          />
        </View>

        <View style={styles.block}>
          <SettingsLogoutButton />
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
  block: {
    marginTop: 16,
  },
});
