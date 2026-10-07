import {
  ChatBubbleIcon,
  HeartIcon,
  HomeIcon,
  MenuIcon,
  PersonIcon,
} from '@/components/icons';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
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

type TabKey = 'home' | 'favorites' | 'chat' | 'menu' | 'profile';
type IconComp = ComponentType<{ size?: number; color?: string }>;

function shouldShowNav(pathname: string) {
  return pathname === '/home' || pathname === '/favorites';
}

export function BottomNav() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const openMenu = useSideMenuStore((s) => s.openMenu);
  const menuOpen = useSideMenuStore((s) => s.open);
  const viewing = useMediaViewerStore((s) => !!s.item);
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

  if (!shouldShowNav(pathname) || viewing || keyboardOpen || menuOpen) {
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

  const goChat = () => {
    router.push('/');
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
      key: 'chat',
      label: t('menu.chat'),
      Icon: ChatBubbleIcon,
      onPress: goChat,
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
    pathname === '/favorites' ? 'favorites' : pathname === '/home' ? 'home' : null;

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
          <Pressable key={key} style={styles.tab} onPress={onPress}>
            <View
              style={[
                styles.tabInner,
                isActive &&
                  (isDark ? styles.tabInnerActiveDark : styles.tabInnerActiveLight),
              ]}
            >
              <Icon size={24} color={color} />
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
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  labelActive: {
    fontWeight: '700',
  },
});
