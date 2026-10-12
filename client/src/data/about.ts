import type { LocalizedText } from "@/data/localize";

export type AboutSectionData = {
  id: string;
  icon: string;
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
