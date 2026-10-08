import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import type { Actor } from '@/src/types/actor';
import { resolveActorImage } from '@/src/utils/actorImages';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const AVATAR = 72;
const AVATAR_RADIUS = AVATAR / 2;
const NAME_WIDTH = 88;
const NAME_LINE_HEIGHT = 16;
const NAME_LINES = 2;
const NAME_HEIGHT = NAME_LINE_HEIGHT * NAME_LINES;

type ActorChipProps = {
  actor: Actor;
};

export function ActorChip({ actor }: ActorChipProps) {
  const { colors } = useTheme();
  const [photoReady, setPhotoReady] = useState(false);
  const photo = resolveActorImage(actor.actorImg);
  const nameReady = Boolean(actor.actorName?.trim());

  useEffect(() => {
    setPhotoReady(false);
  }, [actor.id, actor.actorImg]);

  return (
    <Pressable
      style={styles.item}
      onPress={() =>
        router.push({
          pathname: '/actor/[id]',
          params: { id: String(actor.id) },
        })
      }
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.panelSoft,
            borderColor: colors.borderSoft,
          },
        ]}
      >
        {photo && !photoReady ? (
          <SkeletonLoader
            width={AVATAR}
            height={AVATAR}
            borderRadius={AVATAR_RADIUS}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {photo ? (
          <Image
            source={photo}
            style={styles.avatarImg}
            contentFit="cover"
            onLoad={() => setPhotoReady(true)}
            onError={() => setPhotoReady(true)}
          />
        ) : null}
      </View>
      <View style={styles.nameSlot}>
        {nameReady ? (
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={NAME_LINES}
          >
            {actor.actorName}
          </Text>
        ) : (
          <SkeletonLoader
            width={NAME_WIDTH}
            height={NAME_HEIGHT}
            borderRadius={8}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: NAME_WIDTH,
    alignItems: 'center',
    marginRight: 14,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  nameSlot: {
    width: NAME_WIDTH,
    height: NAME_HEIGHT,
    marginTop: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: NAME_LINE_HEIGHT,
  },
});
