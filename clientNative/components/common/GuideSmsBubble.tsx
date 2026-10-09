import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type GuideSmsBubbleProps = {
  visible: boolean;
  text: string;
  gotItLabel: string;
  onGotIt: () => void;
  /** Search: tip above. Chat: tip below toward composer. */
  tail: 'up' | 'down';
  accent: string;
  textOnAccent: string;
  style?: StyleProp<ViewStyle>;
  delayMs?: number;
};

export function GuideSmsBubble({
  visible,
  text,
  gotItLabel,
  onGotIt,
  tail,
  accent,
  textOnAccent,
  style,
  delayMs = 2000,
}: GuideSmsBubbleProps) {
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(0.35)).current;
  const scaleY = useRef(new Animated.Value(0.12)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const playClose = () => {
    animRef.current?.stop();
    animRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scaleX, {
        toValue: 0.35,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scaleY, {
        toValue: 0.08,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);
    animRef.current.start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
    });
  };

  useEffect(() => {
    animRef.current?.stop();

    if (!visible) {
      if (!mountedRef.current) {
        setMounted(false);
        return;
      }
      playClose();
      return () => {
        animRef.current?.stop();
      };
    }

    opacity.setValue(0);
    scaleX.setValue(0.35);
    scaleY.setValue(0.12);

    const timer = setTimeout(() => {
      mountedRef.current = true;
      setMounted(true);
      animRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(scaleX, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.spring(scaleY, {
          toValue: 1,
          friction: 7,
          tension: 62,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
    }, delayMs);

    return () => {
      clearTimeout(timer);
      animRef.current?.stop();
    };
  }, [visible, delayMs, opacity, scaleX, scaleY]);

  if (!visible || !mounted) return null;

  const tailNode = (
    <Animated.View style={tail === 'up' ? styles.tailRowUp : styles.tailRowDown}>
      <Animated.View
        style={[
          tail === 'up' ? styles.tailUp : styles.tailDown,
          tail === 'up'
            ? { borderBottomColor: accent }
            : { borderTopColor: accent },
        ]}
      />
    </Animated.View>
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        style,
        {
          opacity,
          transform: [{ scaleX }, { scaleY }],
          // Anchor grow at the dumcha tip
          transformOrigin: tail === 'up' ? '40px 0%' : '40px 100%',
        } as ViewStyle,
      ]}
    >
      {tail === 'up' ? tailNode : null}
      <Animated.View style={[styles.bubble, { backgroundColor: accent }]}>
        <Text style={[styles.text, { color: textOnAccent }]}>{text}</Text>
        <Pressable
          style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={onGotIt}
          hitSlop={16}
        >
          <Text style={[styles.btnText, { color: textOnAccent }]}>
            {gotItLabel}
          </Text>
        </Pressable>
      </Animated.View>
      {tail === 'down' ? tailNode : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 30,
    elevation: 30,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  btn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tailRowUp: {
    paddingLeft: 28,
    marginBottom: -1,
  },
  tailRowDown: {
    alignItems: 'flex-start',
    paddingLeft: 28,
    marginTop: -1,
  },
  tailUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
