import {
  ChatBubbleIcon,
  ChevronRightIcon,
  HomeIcon,
  LogoutIcon,
  PersonIcon,
  PlusIcon,
  SettingsIcon,
} from '@/components/icons';
import { colors } from '@/constants/theme';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavKey = 'home' | 'chat' | 'profile' | 'settings' | 'newChat';
type IconComp = ComponentType<{ size?: number; color?: string }>;

const NAV_ITEMS: {
  key: NavKey;
  label: string;
  Icon: IconComp;
}[] = [
  { key: 'home', label: 'Bosh sahifa', Icon: HomeIcon },
  { key: 'chat', label: 'AI Chat', Icon: ChatBubbleIcon },
  { key: 'profile', label: 'Profil', Icon: PersonIcon },
  { key: 'settings', label: 'Sozlamalar', Icon: SettingsIcon },
  { key: 'newChat', label: 'Yangi chat', Icon: PlusIcon },
];

const THRESHOLD = 0.4;
const FLING_VELOCITY = 700;
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

type SideMenuProps = {
  children: ReactNode;
};

export function SideMenu({ children }: SideMenuProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const open = useSideMenuStore((state) => state.open);
  const openMenu = useSideMenuStore((state) => state.openMenu);
  const closeMenu = useSideMenuStore((state) => state.closeMenu);
  const viewing = useMediaViewerStore((state) => !!state.item);
  const menuW = width * 0.7;

  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const menuWidthSV = useSharedValue(menuW);
  const [layerOn, setLayerOn] = useState(false);

  useEffect(() => {
    menuWidthSV.value = menuW;
  }, [menuW, menuWidthSV]);

  useEffect(() => {
    if (open) {
      setLayerOn(true);
      progress.value = withTiming(1, TIMING);
      return;
    }
    progress.value = withTiming(0, TIMING, (finished) => {
      if (finished) runOnJS(setLayerOn)(false);
    });
  }, [open, progress]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });
    return () => sub.remove();
  }, [open, closeMenu]);

  const markLayerOn = () => setLayerOn(true);

  const goProfile = () => {
    closeMenu();
    router.push('/profile');
  };

  const goSettings = () => {
    closeMenu();
    router.push('/settings');
  };

  const handleNav = (key: NavKey) => {
    if (key === 'profile') {
      goProfile();
      return;
    }
    if (key === 'settings') {
      goSettings();
      return;
    }
    closeMenu();
  };

  const snapOpen = () => {
    'worklet';
    progress.value = withTiming(1, TIMING, (finished) => {
      if (finished) runOnJS(openMenu)();
    });
  };

  const snapClose = () => {
    'worklet';
    progress.value = withTiming(0, TIMING, (finished) => {
      if (finished) {
        runOnJS(closeMenu)();
        runOnJS(setLayerOn)(false);
      }
    });
  };

  const openGesture = Gesture.Pan()
    .enabled(!viewing && !open)
    .activeOffsetX(14)
    .failOffsetY([-28, 28])
    .onStart(() => {
      runOnJS(markLayerOn)();
      dragStart.value = progress.value;
    })
    .onUpdate((e) => {
      const next = dragStart.value + e.translationX / menuWidthSV.value;
      progress.value = Math.min(1, Math.max(0, next));
    })
    .onEnd((e) => {
      const flingOpen = e.velocityX > FLING_VELOCITY;
      if (progress.value >= THRESHOLD || flingOpen) {
        snapOpen();
      } else {
        snapClose();
      }
    });

  const makeClosePan = () =>
    Gesture.Pan()
      .enabled(!viewing && open)
      .activeOffsetX(-14)
      .failOffsetY([-28, 28])
      .onStart(() => {
        dragStart.value = progress.value;
      })
      .onUpdate((e) => {
        const next = dragStart.value + e.translationX / menuWidthSV.value;
        progress.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((e) => {
        const flingClose = e.velocityX < -FLING_VELOCITY;
        if (progress.value <= 1 - THRESHOLD || flingClose) {
          snapClose();
        } else {
          snapOpen();
        }
      });

  const panelCloseGesture = makeClosePan();
  const backdropCloseGesture = makeClosePan();

  const backdropTap = Gesture.Tap().onEnd(() => {
    runOnJS(closeMenu)();
  });

  const backdropGesture = Gesture.Exclusive(backdropCloseGesture, backdropTap);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * -menuWidthSV.value }],
  }));

  return (
    <GestureDetector gesture={openGesture}>
      <View style={styles.shell}>
        {children}

        <View
          style={[StyleSheet.absoluteFill, styles.overlay]}
          pointerEvents={layerOn || open ? 'auto' : 'none'}
        >
          {/* Body overlay — chapga drag yoki tap */}
          <GestureDetector gesture={backdropGesture}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
          </GestureDetector>

          <GestureDetector gesture={panelCloseGesture}>
            <Animated.View
              style={[
                styles.panel,
                {
                  width: menuW,
                  paddingTop: insets.top + 12,
                  paddingBottom: Math.max(insets.bottom, 14),
                },
                panelStyle,
              ]}
            >
              <Pressable style={styles.profileRow} onPress={goProfile}>
                <View style={styles.avatar}>
                  <PersonIcon size={26} color={colors.icon} />
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.profileName}>Name:</Text>
                  <Text style={styles.profileEmail}>Gmail:</Text>
                </View>
                <ChevronRightIcon size={18} color={colors.textMuted} />
              </Pressable>

              <View style={styles.nav}>
                {NAV_ITEMS.map(({ key, label, Icon }) => {
                const active = key === 'chat';
                const content = (
                  <>
                    <Icon size={22} color={active ? colors.text : colors.icon} />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                      {label}
                    </Text>
                  </>
                );

                if (active) {
                  return (
                    <Pressable key={key} onPress={() => handleNav(key)}>
                      <LinearGradient
                        colors={['#121A2C', '#0A101C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.navItemActive}
                      >
                        {content}
                      </LinearGradient>
                    </Pressable>
                  );
                }

                  return (
                    <Pressable key={key} style={styles.navItem} onPress={() => handleNav(key)}>
                      {content}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.divider} />

              <View style={styles.history}>
                <Text style={styles.historyTitle}>Oldingi suhbatlar</Text>
                <View style={styles.historyEmpty} />
              </View>

              <Pressable style={styles.logout} onPress={closeMenu}>
                <LogoutIcon size={22} color={colors.icon} />
                <Text style={styles.logoutText}>Chiqish</Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  overlay: {
    zIndex: 60,
  },
  backdrop: {
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#05070F',
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    paddingHorizontal: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 140, 255, 0.55)',
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: 13,
  },
  nav: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 14,
  },
  history: {
    flex: 1,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  historyEmpty: {
    flex: 1,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
