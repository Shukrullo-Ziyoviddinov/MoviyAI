"use client";

import type { ReactNode } from "react";
import { ChatProvider } from "@/components/chat/chat-state";
import { LanguageProvider } from "@/components/language/language-state";
import { SideMenu } from "@/components/menu/SideMenu";
import { ThemeProvider } from "@/components/theme/theme-state";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ChatProvider>
          <SideMenu>{children}</SideMenu>
        </ChatProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
