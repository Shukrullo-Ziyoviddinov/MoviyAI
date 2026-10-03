import { PersonIcon, SettingsIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LOGO_LIGHT = require('../../assets/images/MY_preview_rev_1.png');
const LOGO_DARK_ON_LIGHT = require('../../assets/images/qoralogo_preview_rev_1.png');

type ProfileHeaderProps = {
  name?: string;
  email?: string;
  onSettingsPress?: () => void;
};

export function ProfileHeader({
  name = 'Name:',
  email = 'Gmail:',
  onSettingsPress,
}: ProfileHeaderProps) {
  const { colors, isDark } = useTheme();
  const logo = isDark ? LOGO_LIGHT : LOGO_DARK_ON_LIGHT;

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <Pressable
          style={[
            styles.settingsBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={onSettingsPress}
        >
          <SettingsIcon size={20} color={colors.icon} />
        </Pressable>
      </View>

      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: colors.panelSoft }]}>
          <PersonIcon size={36} color={colors.icon} />
        </View>
        <View style={styles.userText}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{email}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  logo: {
    width: 36,
    height: 36,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(120, 90, 255, 0.55)',
  },
  userText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
  },
});
