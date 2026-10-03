export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  panel: string;
  panelSoft: string;
  border: string;
  borderSoft: string;
  accent: string;
  accentBright: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  icon: string;
};

export const darkColors: ThemeColors = {
  bg: '#030308',
  bgDeep: '#000000',
  panel: '#070A12',
  panelSoft: '#0A0E18',
  border: 'rgba(40, 70, 130, 0.35)',
  borderSoft: 'rgba(30, 50, 90, 0.28)',
  accent: '#1E4FD6',
  accentBright: '#2A5FE0',
  text: '#F3F4F6',
  textMuted: '#6B7280',
  textOnAccent: '#F3F4F6',
  icon: '#D1D5DB',
};

export const lightColors: ThemeColors = {
  bg: '#F4F6FA',
  bgDeep: '#E8ECF4',
  panel: '#FFFFFF',
  panelSoft: '#EEF1F7',
  border: 'rgba(40, 70, 130, 0.18)',
  borderSoft: 'rgba(30, 50, 90, 0.12)',
  accent: '#1E4FD6',
  accentBright: '#2A5FE0',
  text: '#111827',
  textMuted: '#6B7280',
  textOnAccent: '#F3F4F6',
  icon: '#374151',
};

/** @deprecated use useTheme().colors — dark default for rare static refs */
export const colors = darkColors;

export const palettes: Record<ThemeMode, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};
