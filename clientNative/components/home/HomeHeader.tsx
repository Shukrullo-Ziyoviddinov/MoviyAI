import { SearchIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

const LOGO_LIGHT = require('../../assets/images/MY_preview_rev_1.png');
const LOGO_DARK_ON_LIGHT = require('../../assets/images/qoralogo_preview_rev_1.png');

type HomeHeaderProps = {
  onSearchPress?: () => void;
};

export function HomeHeader({ onSearchPress }: HomeHeaderProps) {
  const { colors, isDark } = useTheme();
  const logo = isDark ? LOGO_LIGHT : LOGO_DARK_ON_LIGHT;

  return (
    <View style={styles.wrap}>
      <Image
        source={logo}
        style={styles.logo}
        contentFit="contain"
        contentPosition="left"
      />
      <Pressable
        style={[
          styles.searchBtn,
          { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
        ]}
        onPress={onSearchPress}
      >
        <SearchIcon size={20} color={colors.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logo: {
    width: 108,
    height: 36,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
