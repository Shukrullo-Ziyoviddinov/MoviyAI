import { PersonIcon, SettingsIcon } from '@/components/icons';
import { colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LOGO = require('../../assets/images/MY_preview_rev_1.png');

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
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Pressable style={styles.settingsBtn} onPress={onSettingsPress}>
          <SettingsIcon size={20} color={colors.icon} />
        </Pressable>
      </View>

      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <PersonIcon size={36} color={colors.icon} />
        </View>
        <View style={styles.userText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
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
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
    backgroundColor: colors.panelSoft,
    borderWidth: 2,
    borderColor: 'rgba(120, 90, 255, 0.55)',
  },
  userText: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
