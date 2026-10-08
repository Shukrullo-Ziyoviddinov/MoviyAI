import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type UserAvatarProps = {
  name?: string;
  picture?: string | null;
  size?: number;
  onPhotoReady?: () => void;
};

export function UserAvatar({
  name = '',
  picture,
  size = 40,
  onPhotoReady,
}: UserAvatarProps) {
  const { colors } = useTheme();
  const letter = (name.trim().charAt(0) || '?').toUpperCase();
  const photo = picture?.trim() || '';
  const [photoReady, setPhotoReady] = useState(!photo);
  const photoRef = useRef(photo);

  useEffect(() => {
    if (photoRef.current === photo) return;
    photoRef.current = photo;
    setPhotoReady(!photo);
  }, [photo]);

  const finish = () => {
    setPhotoReady(true);
    onPhotoReady?.();
  };

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
      {photo && !photoReady ? (
        <SkeletonLoader
          width={size}
          height={size}
          borderRadius={size / 2}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={styles.image}
          contentFit="cover"
          onLoad={finish}
          onError={finish}
        />
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
