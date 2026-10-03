import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileMenuCard } from '@/components/profile/ProfileMenuCard';
import { colors } from '@/constants/theme';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
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
    backgroundColor: colors.bg,
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
