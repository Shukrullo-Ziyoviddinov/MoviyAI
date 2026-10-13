"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChatBubbleIcon,
  ChevronRightIcon,
  CloseIcon,
  HomeIcon,
  LogoutIcon,
  PersonIcon,
  PlusIcon,
  SettingsIcon,
} from "@/components/icons";
import { useChat } from "@/components/chat/chat-state";
import { colors } from "@/constants/theme";

const SLIDE = "260ms cubic-bezier(0.33, 1, 0.68, 1)";

type NavKey = "home" | "chat" | "profile" | "settings" | "newChat";

const NAV_ITEMS: { key: NavKey; label: string; Icon: typeof HomeIcon }[] = [
  { key: "home", label: "Asosiy", Icon: HomeIcon },
  { key: "chat", label: "AI suhbat", Icon: ChatBubbleIcon },
  { key: "profile", label: "Profil", Icon: PersonIcon },
  { key: "settings", label: "Sozlamalar", Icon: SettingsIcon },
  { key: "newChat", label: "Yangi chat", Icon: PlusIcon },
];

type SideMenuContextValue = {
  desktopOpen: boolean;
  mobileOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const SideMenuContext = createContext<SideMenuContextValue | null>(null);

export function useSideMenu() {
  const value = useContext(SideMenuContext);
  if (!value) throw new Error("useSideMenu must be used within SideMenu");
  return value;
}

function isDesktop() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function panelWidth() {
  return Math.round(window.innerWidth * 0.7);
}

export function SideMenu({ children }: { children: ReactNode }) {
  const { viewer } = useChat();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; active: boolean; base: number } | null>(null);
  const dragWidthRef = useRef<number | null>(null);

  function openMenu() {
    if (isDesktop()) setDesktopOpen(true);
    else setMobileOpen(true);
  }

  function closeMenu() {
    if (isDesktop()) setDesktopOpen(false);
    else setMobileOpen(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || viewer || isDesktop()) return;
      setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  function onTouchStart(event: React.TouchEvent) {
    if (isDesktop() || viewer) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-media-strip]")) return;
    const touch = event.touches[0];
    drag.current = {
      x: touch.clientX,
      y: touch.clientY,
      active: false,
      base: mobileOpen ? panelWidth() : 0,
    };
  }

  function onTouchMove(event: React.TouchEvent) {
    const state = drag.current;
    if (!state) return;
    const touch = event.touches[0];
    const dx = touch.clientX - state.x;
    const dy = touch.clientY - state.y;
    if (!state.active) {
      if (Math.abs(dx) < 14) return;
      if (Math.abs(dy) > Math.abs(dx) || (!mobileOpen && dx < 0)) {
        drag.current = null;
        return;
      }
      state.active = true;
    }
    const next = Math.min(panelWidth(), Math.max(0, state.base + dx));
    dragWidthRef.current = next;
    setDragWidth(next);
  }

  function onTouchEnd() {
    const state = drag.current;
    const current = dragWidthRef.current;
    drag.current = null;
    dragWidthRef.current = null;
    setDragWidth(null);
    if (!state?.active || current == null) return;
    setMobileOpen(current / panelWidth() >= 0.4);
  }

  const mobileVisible = mobileOpen || dragWidth != null;
  const reveal = dragWidth ?? (mobileOpen ? panelWidth() : 0);
  const backdrop = dragWidth != null ? (reveal / Math.max(panelWidth(), 1)) * 0.55 : mobileOpen ? 0.55 : 0;

  return (
    <SideMenuContext.Provider value={{ desktopOpen, mobileOpen, openMenu, closeMenu }}>
      <div
        className="flex h-dvh w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <aside
          className={`relative hidden h-full shrink-0 md:block ${desktopOpen ? "w-[300px] overflow-hidden" : "z-40 w-[72px] overflow-visible"}`}
          style={{ transition: `width ${SLIDE}` }}
        >
          <div
            className="flex h-full flex-col border-r"
            style={{
              width: desktopOpen ? 300 : 72,
              backgroundColor: colors.panel,
              borderColor: colors.borderSoft,
              transition: `width ${SLIDE}`,
            }}
          >
            <MenuBody
              showClose
              collapsed={!desktopOpen}
              onClose={() => setDesktopOpen(false)}
              onOpen={() => setDesktopOpen(true)}
            />
          </div>
        </aside>

        <div className="relative h-dvh min-w-0 flex-1">{children}</div>

        <div
          className={`fixed inset-0 z-[70] md:hidden ${mobileVisible ? "" : "pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label="Yopish"
            className="absolute inset-0 border-0 bg-black p-0"
            style={{
              opacity: backdrop,
              transition: dragWidth != null ? "none" : `opacity ${SLIDE}`,
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute top-0 bottom-0 left-0 flex w-[70%] flex-col border-r"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.borderSoft,
              paddingTop: "max(12px, env(safe-area-inset-top))",
              paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              transform:
                dragWidth != null
                  ? `translateX(calc(-100% + ${dragWidth}px))`
                  : mobileOpen
                    ? "translateX(0)"
                    : "translateX(-100%)",
              transition: dragWidth != null ? "none" : `transform ${SLIDE}`,
            }}
          >
            <MenuBody onPick={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
    </SideMenuContext.Provider>
  );
}

const LOGO = "/images/MY_preview_rev_1.png";

function RailTip({ label, enabled, children }: { label: string; enabled: boolean; children: ReactNode }) {
  if (!enabled) return children;
  return (
    <div className="group relative flex justify-center">
      {children}
      <span
        className="pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-50 -translate-y-1/2 rounded-lg px-2.5 py-1 text-[13px] font-medium whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: colors.panelSoft, color: colors.text, border: `1px solid ${colors.borderSoft}` }}
      >
        {label}
      </span>
    </div>
  );
}

function MenuBody({
  showClose = false,
  collapsed = false,
  onClose,
  onOpen,
  onPick,
}: {
  showClose?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onPick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(href: string) {
    onPick?.();
    router.push(href);
  }

  function onItem(key: NavKey) {
    if (collapsed) {
      onOpen?.();
      return;
    }
    if (key === "home") go("/home");
    else if (key === "chat") go("/");
    else if (key === "profile") go("/profile");
    else if (key === "settings") go("/settings");
    else onPick?.();
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${collapsed ? "cursor-pointer items-center px-2" : "px-3"}`}
      style={showClose ? { paddingTop: 12, paddingBottom: 14 } : undefined}
      onClick={collapsed ? onOpen : undefined}
    >
      {showClose ? (
        <div className={`flex items-center ${collapsed ? "mb-3 w-full justify-center" : "mb-1 justify-between"}`}>
          {collapsed ? (
            <button
              type="button"
              aria-label="Menyu"
              onClick={onOpen}
              className="flex h-11 w-full items-center justify-center"
            >
              <img src={LOGO} alt="" className="h-8 w-[56px] object-contain" />
            </button>
          ) : (
            <img src={LOGO} alt="" className="ml-1 h-9 w-[140px] object-contain object-left" />
          )}
          {collapsed ? null : (
            <button
              type="button"
              aria-label="Yopish"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center"
            >
              <CloseIcon size={22} color={colors.icon} />
            </button>
          )}
        </div>
      ) : null}

      <RailTip label="Google orqali kirish" enabled={collapsed}>
        <button
          type="button"
          aria-label="Google orqali kirish"
          onClick={() => (collapsed ? onOpen?.() : go("/profile"))}
          className={collapsed ? "mb-3 flex items-center justify-center" : "mb-[18px] flex w-full items-center gap-2.5 px-1 py-2 text-left"}
        >
          <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white">
            <img src="/images/google-logo.png" alt="" className="h-[26px] w-[26px] object-contain" />
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-bold" style={{ color: colors.text }}>
                  Google orqali kirish
                </span>
                <span className="mt-[3px] block truncate text-[13px]" style={{ color: colors.textMuted }}>
                  Davom etish uchun Google orqali kiring
                </span>
              </span>
              <ChevronRightIcon size={18} color={colors.textMuted} />
            </>
          )}
        </button>
      </RailTip>

      <div className={`flex flex-col gap-1.5 ${collapsed ? "w-full items-center" : ""}`}>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active =
            (key === "home" && pathname === "/home") ||
            (key === "chat" && pathname === "/") ||
            (key === "profile" && pathname === "/profile") ||
            (key === "settings" && pathname === "/settings");
          return (
            <RailTip key={key} label={label} enabled={collapsed}>
              <button
                type="button"
                aria-label={label}
                onClick={() => onItem(key)}
                className={
                  collapsed
                    ? "flex h-11 w-11 items-center justify-center rounded-xl"
                    : "flex w-full items-center gap-3 rounded-xl px-3 py-[13px] text-left"
                }
                style={
                  active
                    ? {
                        backgroundColor: "rgba(30, 79, 214, 0.22)",
                        border: `1px solid ${colors.border}`,
                      }
                    : undefined
                }
              >
                <Icon size={22} color={active ? colors.accentBright : colors.icon} />
                {collapsed ? null : (
                  <span className={`text-[15px] ${active ? "font-bold" : "font-medium"}`} style={{ color: colors.text }}>
                    {label}
                  </span>
                )}
              </button>
            </RailTip>
          );
        })}
      </div>

      {collapsed ? (
        <div className="min-h-0 flex-1" />
      ) : (
        <>
          <div className="my-3.5 h-px" style={{ backgroundColor: colors.borderSoft }} />
          <div className="min-h-0 flex-1">
            <p className="mb-2 px-1 text-[15px] font-medium" style={{ color: colors.text }}>
              Oldingi suhbatlar
            </p>
          </div>
        </>
      )}

      <RailTip label="Chiqish" enabled={collapsed}>
        <button
          type="button"
          aria-label="Chiqish"
          onClick={() => (collapsed ? onOpen?.() : onPick?.())}
          className={collapsed ? "flex h-11 w-11 items-center justify-center rounded-xl" : "flex w-full items-center gap-3 px-3 py-[13px] text-left"}
        >
          <LogoutIcon size={22} color={colors.icon} />
          {collapsed ? null : (
            <span className="text-[15px] font-medium" style={{ color: colors.text }}>
              Chiqish
            </span>
          )}
        </button>
      </RailTip>
    </div>
  );
}
