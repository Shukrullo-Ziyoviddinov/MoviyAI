import type { LocalizedText } from '@/src/data/localize';
import aboutJson from '@/src/data/about.json';

export type AboutSectionData = {
  id: string;
  icon: 'film' | 'search' | 'gallery' | 'video' | 'chat' | 'star';
  iconColor: string;
  iconBg: string;
  defaultOpen: boolean;
  title: LocalizedText;
  body: LocalizedText;
};

export type AboutData = {
  id: string;
  slug: string;
  version: number;
  page: {
    title: LocalizedText;
    subtitle: LocalizedText;
  };
  sections: AboutSectionData[];
};

export const aboutData = aboutJson as AboutData;
