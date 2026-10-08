import { ChevronRightIcon, PersonIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsProfileCardProps = {
  name?: string;
  email?: string;
  picture?: string | null;
  onPress?: () => void;
};

export function SettingsProfileCard({
  name = 'Name:',
  email = 'Gmail:',
  picture,
  onPress,
}: SettingsProfileCardProps) {
  const { colors } = useTheme();
  const photo = picture?.trim() || '';
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photo]);

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: colors.panelSoft }]}>
        {photo && !photoFailed ? (
          <Image
            source={{ uri: photo }}
            style={styles.avatarImg}
            contentFit="cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <PersonIcon size={28} color={colors.icon} />
        )}
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(120, 90, 255, 0.55)',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  text: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
  },
});
