import { UserAvatar } from '@/components/common/UserAvatar';
import { SettingsIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LOGO_LIGHT = require('../../assets/images/MY_preview_rev_1.png');
const LOGO_DARK_ON_LIGHT = require('../../assets/images/qoralogo_preview_rev_1.png');

type ProfileHeaderProps = {
  name?: string;
  email?: string;
  picture?: string | null;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
};

export function ProfileHeader({
  name = 'Name:',
  email = 'Gmail:',
  picture,
  onSettingsPress,
  onProfilePress,
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

      <Pressable style={styles.userRow} onPress={onProfilePress}>
        <UserAvatar name={name} picture={picture} size={72} />
        <View style={styles.userText}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{email}</Text>
        </View>
      </Pressable>
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
