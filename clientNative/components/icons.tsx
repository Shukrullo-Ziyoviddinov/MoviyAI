import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
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

export function CameraIcon({ size = 18, color = '#E5E7EB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5H7L8.5 6.5H15.5L17 8.5H20C20.8 8.5 21.5 9.2 21.5 10V17C21.5 17.8 20.8 18.5 20 18.5H4C3.2 18.5 2.5 17.8 2.5 17V10C2.5 9.2 3.2 8.5 4 8.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3" stroke={color} strokeWidth="2" />
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
