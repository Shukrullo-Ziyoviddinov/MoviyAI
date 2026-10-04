import type { ImageSource } from 'expo-image';

const POSTERS: Record<string, ImageSource> = {
  'movie1.jpg': require('../../assets/images/movie1.jpg'),
  'movie2.jpg': require('../../assets/images/movie2.jpg'),
  'movie4.jpg': require('../../assets/images/movie4.jpg'),
  'movie5.jpg': require('../../assets/images/movie5.jpg'),
  'movie8.jpg': require('../../assets/images/movie8.jpg'),
  'movie9.jpg': require('../../assets/images/movie9.jpg'),
  'movie10.jpg': require('../../assets/images/movie10.jpg'),
  'movie14.jpg': require('../../assets/images/movie14.jpg'),
  'movie17.jpg': require('../../assets/images/movie17.jpg'),
  'movie18.jpg': require('../../assets/images/movie18.jpg'),
};

export function resolveMoviePoster(path?: string): ImageSource | null {
  if (!path) return null;
  const file = path.split('/').pop() ?? path;
  return POSTERS[file] ?? null;
}
