"use client";

import { InfoIcon, ShieldIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { PrivacyBullet, PrivacyParagraph, PrivacySection, PrivacySubheading } from "@/components/privacy/PrivacySection";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useTheme } from "@/components/theme/theme-state";
import { pickLocalized } from "@/data/localize";
import type { PrivacyData } from "@/data/privacy";

const ICONS = {
  shield: ShieldIcon,
  info: InfoIcon,
};

const FALLBACK_TITLE = {
  uz: "Maxfiylik va xavfsizlik",
  ru: "Конфиденциальность и безопасность",
  en: "Privacy and security",
};

export function PrivacyScreen({ data, error }: { data: PrivacyData | null; error: string | null }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const title = data ? pickLocalized(data.page.title, language) : pickLocalized(FALLBACK_TITLE, language);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "calc(var(--tg-chrome, 0px) + var(--tg-safe-pad, max(10px, env(safe-area-inset-top))))",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title={title} subtitle={data ? pickLocalized(data.page.subtitle, language) : undefined} />
      {error ? (
        <p className="px-[18px] pt-8 text-center text-[14px]" style={{ color: colors.textMuted }}>
          {error}
        </p>
      ) : data ? (
        <div className="mt-[18px] flex flex-col gap-2.5 px-4">
          {data.sections.map((section) => {
            const Icon = ICONS[section.icon as keyof typeof ICONS] ?? ShieldIcon;
            return (
              <PrivacySection
                key={section.id}
                title={pickLocalized(section.title, language)}
                Icon={Icon}
                iconColor={section.iconColor}
                iconBg={section.iconBg}
              >
                {section.items.map((item) => {
                  const text = pickLocalized(item.text, language);
                  if (item.type === "subheading") return <PrivacySubheading key={item.id} text={text} />;
                  if (item.type === "bullet") return <PrivacyBullet key={item.id} text={text} />;
                  return <PrivacyParagraph key={item.id} text={text} />;
                })}
              </PrivacySection>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
