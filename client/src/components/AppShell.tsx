"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-state";
import { GoogleAuthModal } from "@/components/auth/GoogleAuthModal";
import { ChatProvider } from "@/components/chat/chat-state";
import { LanguageProvider } from "@/components/language/language-state";
import { SideMenu } from "@/components/menu/SideMenu";
import { TelegramChromeProvider } from "@/components/telegram/TelegramFullscreen";
import { ThemeProvider } from "@/components/theme/theme-state";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TelegramChromeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ChatProvider>
              <SideMenu>{children}</SideMenu>
              <GoogleAuthModal />
            </ChatProvider>
          </AuthProvider>
        </LanguageProvider>
      </TelegramChromeProvider>
    </ThemeProvider>
  );
}
