"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from "@/constants/theme";

const KEY = "moviy-theme";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  function toggle() {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(KEY, next);
      return next;
    });
  }

  const isDark = mode === "dark";
  return (
    <ThemeContext.Provider value={{ mode, colors: isDark ? darkColors : lightColors, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
