import type { LocalizedText } from "@/data/localize";

export type PrivacyItemType = "subheading" | "bullet" | "paragraph";

export type PrivacyItem = {
  id: string;
  type: PrivacyItemType;
  text: LocalizedText;
};

export type PrivacySectionData = {
  id: string;
  icon: string;
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
