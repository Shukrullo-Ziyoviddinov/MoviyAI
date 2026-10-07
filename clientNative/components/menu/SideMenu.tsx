import { UserAvatar } from '@/components/common/UserAvatar';
import {
  ChatBubbleIcon,
  ChevronRightIcon,
  HomeIcon,
  LogoutIcon,
  PersonIcon,
  PlusIcon,
  SettingsIcon,
} from '@/components/icons';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { router, usePathname } from 'expo-router';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  Icon: IconComp;
}[] = [
  { key: 'home', labelKey: 'menu.home', Icon: HomeIcon },
  { key: 'chat', labelKey: 'menu.chat', Icon: ChatBubbleIcon },
  { key: 'profile', labelKey: 'menu.profile', Icon: PersonIcon },
  { key: 'settings', labelKey: 'menu.settings', Icon: SettingsIcon },
  { key: 'newChat', labelKey: 'menu.newChat', Icon: PlusIcon },
];

const THRESHOLD = 0.4;
const FLING_VELOCITY = 700;
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

type SideMenuProps = {
  children: ReactNode;
};

function isNavActive(key: NavKey, pathname: string) {
  if (key === 'home') return pathname === '/home';
  if (key === 'chat') return pathname === '/' || pathname === '/index';
  if (key === 'profile') return pathname === '/profile';
  if (key === 'settings') return pathname === '/settings';
  return false;
}

export function SideMenu({ children }: SideMenuProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const open = useSideMenuStore((state) => state.open);
  const openMenu = useSideMenuStore((state) => state.openMenu);
  const closeMenu = useSideMenuStore((state) => state.closeMenu);
  const viewing = useMediaViewerStore((state) => !!state.item);
  const profile = useAuthStore((s) => s.profile);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);
  const clearWishlist = useWishlistStore((s) => s.clear);
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
    if (!profile) {
      openAuthModal('profile');
      return;
    }
    router.push('/profile');
  };

  const onLogout = async () => {
    closeMenu();
    await logout();
    clearWishlist();
  };

  const goSettings = () => {
    closeMenu();
    router.push('/settings');
  };

  const goHome = () => {
    closeMenu();
    if (pathname === '/home') return;
    router.push('/home');
  };

  const goChat = () => {
    closeMenu();
    if (pathname === '/' || pathname === '/index') return;
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handleNav = (key: NavKey) => {
    if (key === 'home') {
      goHome();
      return;
    }
    if (key === 'chat') {
      goChat();
      return;
    }
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
      <View style={[styles.shell, (layerOn || open) && styles.shellRaised]}>
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
                  backgroundColor: colors.panel,
                  borderRightColor: colors.borderSoft,
                },
                panelStyle,
              ]}
            >
              <Pressable style={styles.profileRow} onPress={goProfile}>
                <UserAvatar
                  name={profile?.name || t('auth.title')}
                  picture={profile?.picture}
                  size={50}
                />
                <View style={styles.profileText}>
                  <Text
                    style={[styles.profileName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {profile?.name || t('auth.title')}
                  </Text>
                  <Text
                    style={[styles.profileEmail, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {profile?.email || t('auth.loginRequired')}
                  </Text>
                </View>
                <ChevronRightIcon size={18} color={colors.textMuted} />
              </Pressable>

              <View style={styles.nav}>
                {NAV_ITEMS.map(({ key, labelKey, Icon }) => {
                const active = isNavActive(key, pathname);
                const content = (
                  <>
                    <Icon size={22} color={active ? colors.accentBright : colors.icon} />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: colors.text },
                        active && styles.navLabelActive,
                      ]}
                    >
                      {t(labelKey)}
                    </Text>
                  </>
                );

                if (active) {
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleNav(key)}
                      style={[
                        styles.navItemActive,
                        {
                          backgroundColor: isDark
                            ? 'rgba(30, 79, 214, 0.22)'
                            : 'rgba(30, 79, 214, 0.1)',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {content}
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

              <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

              <View style={styles.history}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>
                  {t('menu.previousChats')}
                </Text>
                <View style={styles.historyEmpty} />
              </View>

              <Pressable style={styles.logout} onPress={onLogout}>
                <LogoutIcon size={22} color={colors.icon} />
                <Text style={[styles.logoutText, { color: colors.text }]}>
                  {t('common.logout')}
                </Text>
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
  shellRaised: {
    zIndex: 70,
    elevation: 70,
  },
  overlay: {
    zIndex: 70,
  },
  backdrop: {
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
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
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
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
    borderWidth: 1,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  history: {
    flex: 1,
  },
  historyTitle: {
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
    fontSize: 15,
    fontWeight: '500',
  },
});
