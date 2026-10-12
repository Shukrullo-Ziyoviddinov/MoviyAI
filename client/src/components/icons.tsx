type IconProps = {
  size?: number;
  color?: string;
};

export function MenuIcon({ size = 22, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 22, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 11.5L12 16L16.5 11.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19H19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="2" />
      <path
        d="M5 19.5C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SendIcon({ size = 18, color = "#FFFFFF" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GalleryIcon({ size = 18, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} strokeWidth="2" />
      <circle cx="8.5" cy="10" r="1.5" fill={color} />
      <path
        d="M21 16L15.5 11L10 16L7.5 13.5L3 17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoIcon({ size = 18, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="12" height="10" rx="2" stroke={color} strokeWidth="2" />
      <path d="M15 10.5L21 7.5V16.5L15 13.5V10.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon({ size = 18, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5H7L8.5 6.5H15.5L17 8.5H20C20.8 8.5 21.5 9.2 21.5 10V17C21.5 17.8 20.8 18.5 20 18.5H4C3.2 18.5 2.5 17.8 2.5 17V10C2.5 9.2 3.2 8.5 4 8.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function MicIcon({ size = 18, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="2" />
      <path
        d="M6 11C6 14.3 8.7 17 12 17C15.3 17 18 14.3 18 11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ChatBubbleIcon({ size = 22, color = "#A5B4FC" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 5.5H19C20.1 5.5 21 6.4 21 7.5V14.5C21 15.6 20.1 16.5 19 16.5H13L8.5 19.5V16.5H5C3.9 16.5 3 15.6 3 14.5V7.5C3 6.4 3.9 5.5 5 5.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1.2" fill={color} />
      <circle cx="15" cy="11" r="1.2" fill={color} />
    </svg>
  );
}

export function HomeIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5L12 4L20 10.5V19C20 19.6 19.6 20 19 20H5C4.4 20 4 19.6 4 19V10.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9.5 20V13H14.5V20" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M19.4 13.2C19.47 12.81 19.5 12.41 19.5 12C19.5 11.59 19.47 11.19 19.4 10.8L21.04 9.54C21.19 9.42 21.23 9.2 21.14 9.03L19.59 6.37C19.5 6.2 19.28 6.14 19.11 6.21L17.18 6.98C16.55 6.5 15.85 6.12 15.08 5.87L14.78 3.81C14.75 3.62 14.59 3.5 14.4 3.5H11.3C11.11 3.5 10.95 3.62 10.92 3.81L10.62 5.87C9.85 6.12 9.15 6.5 8.52 6.98L6.59 6.21C6.42 6.14 6.2 6.2 6.11 6.37L4.56 9.03C4.47 9.2 4.51 9.42 4.66 9.54L6.3 10.8C6.23 11.19 6.2 11.59 6.2 12C6.2 12.41 6.23 12.81 6.3 13.2L4.66 14.46C4.51 14.58 4.47 14.8 4.56 14.97L6.11 17.63C6.2 17.8 6.42 17.86 6.59 17.79L8.52 17.02C9.15 17.5 9.85 17.88 10.62 18.13L10.92 20.19C10.95 20.38 11.11 20.5 11.3 20.5H14.4C14.59 20.5 14.75 20.38 14.78 20.19L15.08 18.13C15.85 17.88 16.55 17.5 17.18 17.02L19.11 17.79C19.28 17.86 19.5 17.8 19.59 17.63L21.14 14.97C21.23 14.8 21.19 14.58 21.04 14.46L19.4 13.2Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoutIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 7V5.5C10 4.7 10.7 4 11.5 4H18.5C19.3 4 20 4.7 20 5.5V18.5C20 19.3 19.3 20 18.5 20H11.5C10.7 20 10 19.3 10 18.5V17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M4 12H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8.5L15.5 12L12 15.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ size = 20, color = "#E5E7EB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ size = 22, color = "#A5B4FC" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5L14.4 9.1L20.5 9.6L15.9 13.5L17.3 19.5L12 16.3L6.7 19.5L8.1 13.5L3.5 9.6L9.6 9.1L12 3.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
