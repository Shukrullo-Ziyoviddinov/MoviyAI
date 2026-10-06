import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

type UserAvatarProps = {
  name?: string;
  picture?: string | null;
  size?: number;
};

export function UserAvatar({ name = '', picture, size = 40 }: UserAvatarProps) {
  const { colors } = useTheme();
  const letter = (name.trim().charAt(0) || '?').toUpperCase();

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.panelSoft,
          borderColor: colors.borderSoft,
        },
      ]}
    >
      {picture ? (
        <Image source={{ uri: picture }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={[styles.letter, { color: colors.text, fontSize: size * 0.42 }]}>
          {letter}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  letter: {
    fontWeight: '700',
  },
});
