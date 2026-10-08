import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type BlockSkeletonProps = {
  visible: boolean;
  borderRadius?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Covers `children` with a skeleton that uses their laid-out width and height. */
export function BlockSkeleton({
  visible,
  borderRadius = 8,
  children,
  style,
}: BlockSkeletonProps) {
  if (!visible) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={style} collapsable={false}>
      <View collapsable={false} style={styles.measure}>
        {children}
      </View>
      <SkeletonLoader borderRadius={borderRadius} style={StyleSheet.absoluteFill} />
    </View>
  );
}

type PhotoGateProps = {
  picture?: string | null;
  children: (photoReady: boolean, onPhotoReady: () => void) => ReactNode;
};

export function PhotoGate({ picture, children }: PhotoGateProps) {
  const hasPhoto = Boolean(picture?.trim());
  const [photoReady, setPhotoReady] = useState(!hasPhoto);
  const pictureRef = useRef(picture);

  useEffect(() => {
    if (pictureRef.current === picture) return;
    pictureRef.current = picture;
    setPhotoReady(!Boolean(picture?.trim()));
  }, [picture]);

  return <>{children(photoReady, () => setPhotoReady(true))}</>;
}

const styles = StyleSheet.create({
  measure: {
    opacity: 0,
  },
});
