import { UserAvatar } from '@/components/common/UserAvatar';
import {
  HeartIcon,
  HomeIcon,
  MenuIcon,
  PersonIcon,
} from '@/components/icons';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useKinoModalStore } from '@/src/stores/useKinoModalStore';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Qatiy balandlik — faqat icon + matn */
export const BOTTOM_NAV_BAR = 60;
/** Qurilma tugmasidan yuqoridagi bo'shliq */
export const BOTTOM_NAV_LIFT = 10;

export function useBottomNavOffset(enabled = true) {
  const insets = useSafeAreaInsets();
  if (!enabled) return 0;
  return BOTTOM_NAV_BAR + Math.max(insets.bottom, 0) + BOTTOM_NAV_LIFT;
}

type TabKey = 'home' | 'favorites' | 'kino' | 'menu' | 'profile';
type IconComp = ComponentType<{ size?: number; color?: string }>;

const KINO_LOGO = require('../../assets/images/Kino-olami logo_preview_rev_1.png');

function KinoLogo() {
  return <Image source={KINO_LOGO} style={styles.kinoLogo} contentFit="contain" />;
}

function shouldShowNav(pathname: string) {
  return pathname === '/home' || pathname === '/favorites' || pathname === '/kino-olami';
}

export function BottomNav() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const openMenu = useSideMenuStore((s) => s.openMenu);
  const menuOpen = useSideMenuStore((s) => s.open);
  const viewing = useMediaViewerStore((s) => !!s.item);
  const kinoModalOpen = useKinoModalStore((s) => s.open);
  const profile = useAuthStore((s) => s.profile);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!shouldShowNav(pathname) || viewing || keyboardOpen || (menuOpen && pathname !== '/kino-olami') || (pathname === '/kino-olami' && kinoModalOpen)) {
    return null;
  }

  const goHome = () => {
    if (pathname === '/home') return;
    router.replace('/home');
  };

  const goFavorites = () => {
    if (pathname === '/favorites') return;
    router.replace('/favorites');
  };

  const goProfile = () => {
    router.push('/profile');
  };

  const tabs: {
    key: TabKey;
    label: string;
    Icon: IconComp;
    onPress: () => void;
  }[] = [
    {
      key: 'home',
      label: t('menu.home'),
      Icon: HomeIcon,
      onPress: goHome,
    },
    {
      key: 'favorites',
      label: t('menu.favorites'),
      Icon: HeartIcon,
      onPress: goFavorites,
    },
    {
      key: 'kino',
      label: 'Kino olami',
      Icon: KinoLogo,
      onPress: () => {
        if (pathname !== '/kino-olami') router.push('/kino-olami');
      },
    },
    {
      key: 'menu',
      label: t('menu.menyu'),
      Icon: MenuIcon,
      onPress: openMenu,
    },
    {
      key: 'profile',
      label: t('menu.profile'),
      Icon: PersonIcon,
      onPress: goProfile,
    },
  ];

  const active: TabKey | null =
    pathname === '/kino-olami' ? 'kino' : pathname === '/favorites' ? 'favorites' : 'home';

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 0) + BOTTOM_NAV_LIFT,
          height: BOTTOM_NAV_BAR,
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
        },
      ]}
    >
      {tabs.map(({ key, label, Icon, onPress }) => {
        const isActive = key === active;
        const color = isActive ? colors.accentBright : colors.icon;

        return (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <View
              style={[
                styles.tabInner,
                isActive &&
                  (isDark ? styles.tabInnerActiveDark : styles.tabInnerActiveLight),
              ]}
            >
              {key === 'profile' && profile?.picture ? (
                <UserAvatar
                  name={profile.name}
                  picture={profile.picture}
                  size={24}
                />
              ) : (
                <Icon size={24} color={color} />
              )}
              {key !== 'kino' && (
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? colors.accentBright : colors.textMuted },
                    isActive && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 5,
  },
  tabInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  tabInnerActiveLight: {
    backgroundColor: 'rgba(30, 79, 214, 0.1)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  tabInnerActiveDark: {
    backgroundColor: 'rgba(30, 79, 214, 0.22)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  kinoLogo: {
    width: 48,
    maxWidth: '100%',
    height: 48,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  labelActive: {
    fontWeight: '700',
  },
});
