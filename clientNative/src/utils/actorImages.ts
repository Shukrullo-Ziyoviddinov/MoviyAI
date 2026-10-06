import type { ImageSource } from 'expo-image';

const ACTOR_IMAGES: Record<string, ImageSource> = {
  'actor1.png': require('../../assets/images/actor1.png'),
  'actor2.png': require('../../assets/images/actor2.png'),
  'actor3.png': require('../../assets/images/actor3.png'),
  'actor4.png': require('../../assets/images/actor4.png'),
  'actor5.png': require('../../assets/images/actor5.png'),
};

export function resolveActorImage(path?: string): ImageSource | null {
  if (!path) return null;
  const file = path.split('/').pop() ?? path;
  return ACTOR_IMAGES[file] ?? null;
}
