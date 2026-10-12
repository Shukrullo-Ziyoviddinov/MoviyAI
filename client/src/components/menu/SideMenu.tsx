"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
    <SideMenuContext.Provider value={{ desktopOpen, openMenu, closeMenu }}>
      <div
        className="flex h-dvh w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <aside
          className={`hidden h-full shrink-0 overflow-hidden md:block ${desktopOpen ? "w-[300px]" : "w-0"}`}
          style={{ transition: `width ${SLIDE}` }}
        >
          <div
            className="flex h-full w-[300px] flex-col border-r"
            style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}
          >
            <MenuBody showClose onClose={() => setDesktopOpen(false)} />
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
            className={`absolute top-0 bottom-0 left-0 flex w-[70%] flex-col border-r ${
              dragWidth == null ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : ""
            }`}
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.borderSoft,
              paddingTop: "max(12px, env(safe-area-inset-top))",
              paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              transform: dragWidth != null ? `translateX(calc(-100% + ${dragWidth}px))` : undefined,
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

function MenuBody({
  showClose = false,
  onClose,
  onPick,
}: {
  showClose?: boolean;
  onClose?: () => void;
  onPick?: () => void;
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col px-3"
      style={showClose ? { paddingTop: 12, paddingBottom: 14 } : undefined}
    >
      {showClose ? (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center"
          >
            <CloseIcon size={22} color={colors.icon} />
          </button>
        </div>
      ) : null}

      <button type="button" onClick={onPick} className="mb-[18px] flex items-center gap-2.5 px-1 py-2 text-left">
        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white">
          <img src="/images/google-logo.png" alt="" className="h-[26px] w-[26px] object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold" style={{ color: colors.text }}>
            Google orqali kirish
          </span>
          <span className="mt-[3px] block truncate text-[13px]" style={{ color: colors.textMuted }}>
            Davom etish uchun Google orqali kiring
          </span>
        </span>
        <ChevronRightIcon size={18} color={colors.textMuted} />
      </button>

      <div className="flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = key === "chat";
          return (
            <button
              key={key}
              type="button"
              onClick={onPick}
              className="flex items-center gap-3 rounded-xl px-3 py-[13px] text-left"
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
              <span className={`text-[15px] ${active ? "font-bold" : "font-medium"}`} style={{ color: colors.text }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-3.5 h-px" style={{ backgroundColor: colors.borderSoft }} />

      <div className="min-h-0 flex-1">
        <p className="mb-2 px-1 text-[15px] font-medium" style={{ color: colors.text }}>
          Oldingi suhbatlar
        </p>
      </div>

      <button type="button" onClick={onPick} className="flex items-center gap-3 px-3 py-[13px] text-left">
        <LogoutIcon size={22} color={colors.icon} />
        <span className="text-[15px] font-medium" style={{ color: colors.text }}>
          Chiqish
        </span>
      </button>
    </div>
  );
}
