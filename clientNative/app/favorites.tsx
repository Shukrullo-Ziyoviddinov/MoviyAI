import { FavoritesEmptyState } from '@/components/favorites/FavoritesEmptyState';
import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeHeader } from '@/components/home/HomeHeader';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PAD = 16;

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);

  const goToChat = () => {
    router.push('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: navOffset + 8,
            paddingHorizontal: CONTENT_PAD,
          },
        ]}
      >
        <HomeHeader />
        <FavoritesEmptyState onGoToChat={goToChat} />
      </View>

      <FloatingAiButton onPress={goToChat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
