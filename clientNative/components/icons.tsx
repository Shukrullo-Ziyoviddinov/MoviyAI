import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  filled?: boolean;
};

export function MenuIcon({ size = 22, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 22, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4V15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M7.5 11.5L12 16L16.5 11.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 19H19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PersonIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="2" />
      <Path
        d="M5 19.5C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SendIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="18" cy="19" r="2.5" stroke={color} strokeWidth="2" />
      <Path
        d="M8.2 10.8L15.8 6.2M8.2 13.2L15.8 17.8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GalleryIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="8.5" cy="10" r="1.5" fill={color} />
      <Path
        d="M21 16L15.5 11L10 16L7.5 13.5L3 17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VideoIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="7" width="12" height="10" rx="2" stroke={color} strokeWidth="2" />
      <Path
        d="M15 10.5L21 7.5V16.5L15 13.5V10.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({
  size = 18,
  color = '#E5E7EB',
  strokeWidth = 2,
}: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5H7L8.5 6.5H15.5L17 8.5H20C20.8 8.5 21.5 9.2 21.5 10V17C21.5 17.8 20.8 18.5 20 18.5H4C3.2 18.5 2.5 17.8 2.5 17V10C2.5 9.2 3.2 8.5 4 8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MicIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="2" />
      <Path
        d="M6 11C6 14.3 8.7 17 12 17C15.3 17 18 14.3 18 11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function ImageFindIcon({ size = 15, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="8.5" cy="10" r="1.4" fill={color} />
      <Polyline
        points="3,17 9,12 13,15 16,12 21,16"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size = 15, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M10 8.5L16 12L10 15.5V8.5Z" fill={color} />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 22, color = '#A5B4FC' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5.5H19C20.1 5.5 21 6.4 21 7.5V14.5C21 15.6 20.1 16.5 19 16.5H13L8.5 19.5V16.5H5C3.9 16.5 3 15.6 3 14.5V7.5C3 6.4 3.9 5.5 5 5.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="11" r="1.2" fill={color} />
      <Circle cx="15" cy="11" r="1.2" fill={color} />
    </Svg>
  );
}

export function StarIcon({ size = 22, color = '#A5B4FC' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5L14.4 9.1L20.5 9.6L15.9 13.5L17.3 19.5L12 16.3L6.7 19.5L8.1 13.5L3.5 9.6L9.6 9.1L12 3.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5L12 4L20 10.5V19C20 19.6 19.6 20 19 20H5C4.4 20 4 19.6 4 19V10.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M9.5 20V13H14.5V20" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="2" />
      <Path
        d="M16.5 16.5L20 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function FilmIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke={color} strokeWidth="2" />
      <Path d="M8 4.5V19.5" stroke={color} strokeWidth="2" />
      <Path d="M16 4.5V19.5" stroke={color} strokeWidth="2" />
      <Path d="M3.5 9H8" stroke={color} strokeWidth="2" />
      <Path d="M3.5 14H8" stroke={color} strokeWidth="2" />
      <Path d="M16 9H20.5" stroke={color} strokeWidth="2" />
      <Path d="M16 14H20.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

export function SettingsIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M19.4 13.2C19.47 12.81 19.5 12.41 19.5 12C19.5 11.59 19.47 11.19 19.4 10.8L21.04 9.54C21.19 9.42 21.23 9.2 21.14 9.03L19.59 6.37C19.5 6.2 19.28 6.14 19.11 6.21L17.18 6.98C16.55 6.5 15.85 6.12 15.08 5.87L14.78 3.81C14.75 3.62 14.59 3.5 14.4 3.5H11.3C11.11 3.5 10.95 3.62 10.92 3.81L10.62 5.87C9.85 6.12 9.15 6.5 8.52 6.98L6.59 6.21C6.42 6.14 6.2 6.2 6.11 6.37L4.56 9.03C4.47 9.2 4.51 9.42 4.66 9.54L6.3 10.8C6.23 11.19 6.2 11.59 6.2 12C6.2 12.41 6.23 12.81 6.3 13.2L4.66 14.46C4.51 14.58 4.47 14.8 4.56 14.97L6.11 17.63C6.2 17.8 6.42 17.86 6.59 17.79L8.52 17.02C9.15 17.5 9.85 17.88 10.62 18.13L10.92 20.19C10.95 20.38 11.11 20.5 11.3 20.5H14.4C14.59 20.5 14.75 20.38 14.78 20.19L15.08 18.13C15.85 17.88 16.55 17.5 17.18 17.02L19.11 17.79C19.28 17.86 19.5 17.8 19.59 17.63L21.14 14.97C21.23 14.8 21.19 14.58 21.04 14.46L19.4 13.2Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6L15 12L9 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LogoutIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 7V5.5C10 4.7 10.7 4 11.5 4H18.5C19.3 4 20 4.7 20 5.5V18.5C20 19.3 19.3 20 18.5 20H11.5C10.7 20 10 19.3 10 18.5V17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M4 12H15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M12 8.5L15.5 12L12 15.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function BookmarkIcon({
  size = 20,
  color = '#E5E7EB',
  filled = false,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4.5H17C17.8 4.5 18.5 5.2 18.5 6V20L12 16.2L5.5 20V6C5.5 5.2 6.2 4.5 7 4.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function GlobeIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path
        d="M3.5 12H20.5M12 3.5C14.2 5.8 15.5 8.8 15.5 12C15.5 15.2 14.2 18.2 12 20.5C9.8 18.2 8.5 15.2 8.5 12C8.5 8.8 9.8 5.8 12 3.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MoonIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 13.5C17.9 16.8 14.7 19 11 19C6.6 19 3 15.4 3 11C3 7.3 5.2 4.1 8.5 3C7.7 4.3 7.2 5.8 7.2 7.5C7.2 12.1 10.9 15.8 15.5 15.8C17.2 15.8 18.7 15.3 20 14.5C19.7 14.2 19.4 13.8 19 13.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <Path
        d="M12 2.5V4.5M12 19.5V21.5M4.2 4.2L5.6 5.6M18.4 18.4L19.8 19.8M2.5 12H4.5M19.5 12H21.5M4.2 19.8L5.6 18.4M18.4 5.6L19.8 4.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6L9 12L15 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 9.5C6.5 6.5 8.7 4 12 4C15.3 4 17.5 6.5 17.5 9.5V13L19 16H5L6.5 13V9.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M10 16.5C10 17.6 10.9 18.5 12 18.5C13.1 18.5 14 17.6 14 16.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

export function HeartIcon({
  size = 20,
  color = '#E5E7EB',
  filled = false,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19.5L5.2 13.2C3.6 11.7 3.6 9.2 5.2 7.7C6.8 6.2 9.3 6.2 10.9 7.7L12 8.7L13.1 7.7C14.7 6.2 17.2 6.2 18.8 7.7C20.4 9.2 20.4 11.7 18.8 13.2L12 19.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function LikeIcon({
  size = 20,
  color = '#E5E7EB',
  filled = false,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 10.5V20.5H4.5C3.7 20.5 3 19.8 3 19V12C3 11.2 3.7 10.5 4.5 10.5H7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Path
        d="M7 10.5L10.2 4.8C10.5 4.2 11.2 3.8 12 3.9L12.5 4C13.4 4.1 14 4.9 14 5.8V8.5H18.2C19.4 8.5 20.3 9.6 20 10.8L18.5 17.3C18.3 18.3 17.4 19 16.4 19H7"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function DislikeIcon({
  size = 20,
  color = '#E5E7EB',
  filled = false,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 13.5V3.5H4.5C3.7 3.5 3 4.2 3 5V12C3 12.8 3.7 13.5 4.5 13.5H7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Path
        d="M7 13.5L10.2 19.2C10.5 19.8 11.2 20.2 12 20.1L12.5 20C13.4 19.9 14 19.1 14 18.2V15.5H18.2C19.4 15.5 20.3 14.4 20 13.2L18.5 6.7C18.3 5.7 17.4 5 16.4 5H7"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function ShieldIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5L19.5 6.5V11.5C19.5 15.8 16.5 19.5 12 20.5C7.5 19.5 4.5 15.8 4.5 11.5V6.5L12 3.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloudIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.5 17.5H17C19.2 17.5 21 15.7 21 13.5C21 11.5 19.5 9.8 17.6 9.5C17 7.2 14.9 5.5 12.4 5.5C9.6 5.5 7.3 7.5 6.9 10.2C5.1 10.6 3.8 12.2 3.8 14.1C3.8 16 5.3 17.5 7.5 17.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HelpIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path
        d="M9.5 9.5C9.5 8.1 10.6 7 12 7C13.4 7 14.5 8.1 14.5 9.5C14.5 10.6 13.8 11.3 12.8 11.8C12.3 12 12 12.4 12 12.9V13.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="16.5" r="1" fill={color} />
    </Svg>
  );
}

export function InfoIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path d="M12 11V16.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

export function CalendarIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={color} strokeWidth="2" />
      <Path d="M3.5 10H20.5" stroke={color} strokeWidth="2" />
      <Path d="M8 3.5V7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 3.5V7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path
        d="M12 7.5V12L15 14.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AgeRatingIcon({ size = 20, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth="2" />
      <Path
        d="M9 15.5V10.2C9 9.4 9.6 8.8 10.4 8.8H11.8C13.1 8.8 14.1 9.8 14.1 11.1C14.1 12.4 13.1 13.4 11.8 13.4H9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 15.5H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
