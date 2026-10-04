import type { LocalizedText } from '@/src/data/localize';
import privacyJson from '@/src/data/privacy.json';

export type PrivacyItemType = 'subheading' | 'bullet' | 'paragraph';

export type PrivacyItem = {
  id: string;
  type: PrivacyItemType;
  text: LocalizedText;
};

export type PrivacySectionData = {
  id: string;
  icon: 'shield' | 'info';
  iconColor: string;
  iconBg: string;
  title: LocalizedText;
  items: PrivacyItem[];
};

export type PrivacyData = {
  id: string;
  slug: string;
  version: number;
  page: {
    title: LocalizedText;
    subtitle: LocalizedText;
  };
  sections: PrivacySectionData[];
};

export const privacyData = privacyJson as PrivacyData;
