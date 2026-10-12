"use client";

import { AboutAccordionItem, AboutAccordionList } from "@/components/about/AboutAccordionItem";
import { ChatBubbleIcon, FilmIcon, GalleryIcon, SearchIcon, StarIcon, VideoIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useTheme } from "@/components/theme/theme-state";
import type { AboutData } from "@/data/about";
import { pickLocalized } from "@/data/localize";

const ICONS = {
  film: FilmIcon,
  search: SearchIcon,
  gallery: GalleryIcon,
  video: VideoIcon,
  chat: ChatBubbleIcon,
  star: StarIcon,
};

const FALLBACK_TITLE = { uz: "Ilova haqida", ru: "О приложении", en: "About the app" };

export function AboutScreen({ data, error }: { data: AboutData | null; error: string | null }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const title = data ? pickLocalized(data.page.title, language) : pickLocalized(FALLBACK_TITLE, language);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title={title} subtitle={data ? pickLocalized(data.page.subtitle, language) : undefined} />
      {error ? (
        <p className="px-[18px] pt-8 text-center text-[14px]" style={{ color: colors.textMuted }}>
          {error}
        </p>
      ) : data ? (
        <div className="mt-[18px]">
          <AboutAccordionList>
            {data.sections.map((section) => {
              const Icon = ICONS[section.icon as keyof typeof ICONS] ?? FilmIcon;
              return (
                <AboutAccordionItem
                  key={section.id}
                  title={pickLocalized(section.title, language)}
                  body={pickLocalized(section.body, language)}
                  Icon={Icon}
                  iconColor={section.iconColor}
                  iconBg={section.iconBg}
                  defaultOpen={section.defaultOpen}
                />
              );
            })}
          </AboutAccordionList>
        </div>
      ) : null}
    </div>
  );
}
