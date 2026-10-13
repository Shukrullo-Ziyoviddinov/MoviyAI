"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChatBubbleIcon, HeartIcon, HomeIcon, MenuIcon, PersonIcon } from "@/components/icons";
import { useSideMenu } from "@/components/menu/SideMenu";
import { useTheme } from "@/components/theme/theme-state";

export const BOTTOM_NAV_BAR = 60;
export const BOTTOM_NAV_LIFT = 10;

type TabKey = "home" | "favorites" | "chat" | "menu" | "profile";
type IconComp = (props: { size?: number; color?: string }) => ReactNode;

const TABS: { key: TabKey; label: string; Icon: IconComp; href?: string }[] = [
  { key: "home", label: "Asosiy", Icon: HomeIcon, href: "/home" },
  { key: "favorites", label: "Sevimli", Icon: HeartIcon, href: "/favorites" },
  { key: "chat", label: "AI suhbat", Icon: ChatBubbleIcon, href: "/" },
  { key: "menu", label: "Menyu", Icon: MenuIcon },
  { key: "profile", label: "Profil", Icon: PersonIcon, href: "/profile" },
];

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavBar />
    </Suspense>
  );
}

function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { mobileOpen, openMenu } = useSideMenu();

  if (mobileOpen) return null;

  const active: TabKey | null = pathname === "/favorites" ? "favorites" : pathname === "/home" ? "home" : null;

  function onTab(key: TabKey, href?: string) {
    if (key === "menu") {
      openMenu();
      return;
    }
    if (!href || pathname === href) return;
    if (key === "home" || key === "favorites") router.replace(href);
    else router.push(href);
  }

  return (
    <nav
      className="absolute inset-x-3 z-50 flex h-[60px] items-center justify-around overflow-hidden rounded-[30px] border md:hidden"
      style={{
        bottom: `calc(${BOTTOM_NAV_LIFT}px + env(safe-area-inset-bottom))`,
        backgroundColor: colors.panel,
        borderColor: colors.borderSoft,
      }}
    >
      {TABS.map(({ key, label, Icon, href }) => {
        const isActive = key === active;
        const color = isActive ? colors.accentBright : colors.icon;
        return (
          <button key={key} type="button" onClick={() => onTab(key, href)} className="flex h-full min-w-0 flex-1 items-center justify-center px-[3px] py-[5px]">
            <span
              className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[18px] px-1"
              style={
                isActive
                  ? { backgroundColor: isDark ? "rgba(30, 79, 214, 0.22)" : "rgba(30, 79, 214, 0.1)" }
                  : undefined
              }
            >
              <Icon size={24} color={color} />
              <span
                className={`max-w-full truncate text-[12px] leading-[14px] ${isActive ? "font-bold" : "font-medium"}`}
                style={{ color: isActive ? colors.accentBright : colors.textMuted }}
              >
                {label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
