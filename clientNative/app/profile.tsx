import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileMenuCard } from '@/components/profile/ProfileMenuCard';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);
  const clearWishlist = useWishlistStore((s) => s.clear);

  const onLogout = async () => {
    await logout();
    clearWishlist();
  };

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
        <ProfileHeader
          name={profile?.name || t('auth.title')}
          email={profile?.email || t('auth.loginRequired')}
          picture={profile?.picture}
          onSettingsPress={() => router.push('/settings')}
          onProfilePress={() => {
            if (!profile) openAuthModal('profile');
          }}
        />

        <View style={styles.menuWrap}>
          <ProfileMenuCard
            onSettings={() => router.push('/settings')}
            onSavedMovies={() => {
              if (!profile) {
                openAuthModal('wishlist');
                return;
              }
              router.push('/favorites');
            }}
            onLogout={() => {
              void onLogout();
            }}
          />
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
