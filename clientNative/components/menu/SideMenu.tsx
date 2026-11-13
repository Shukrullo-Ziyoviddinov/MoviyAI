import Svg, { Path } from 'react-native-svg';
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
import { useChatStore } from '@/src/stores/useChatStore';
import { ChatHistoryItem } from './ChatHistoryItem';
import { MenuDrawer } from './MenuDrawer';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const GOOGLE_LOGO = require('../../assets/images/google-logo.png');
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
  const closeMenu = useSideMenuStore((state) => state.closeMenu);
  const profile = useAuthStore((s) => s.profile);
  const hydrated = useAuthStore(s => s.hydrated);
  const conversations = useChatStore(s => s.conversations);
  const activeId = useChatStore(s => s.activeId);
  const listLoading = useChatStore(s => s.listLoading);
  const chatLoading = useChatStore(s => s.loading);
  const chatSending = useChatStore(s => s.sending);
  const initializeChat = useChatStore(s => s.initialize);
  const openChat = useChatStore(s => s.openChat);
  const newChat = useChatStore(s => s.newChat);
  const pinningId = useChatStore(s => s.pinningId);
  const pinError = useChatStore(s => s.pinError);
  const setPinned = useChatStore(s => s.setPinned);
  const deletingId = useChatStore(s => s.deletingId);
  const deleteError = useChatStore(s => s.deleteError);
  const deleteConversation = useChatStore(s => s.deleteConversation);
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);
  const showHistoryMenu = (id: string) => {
    // A long-press queued before dismissal must not reopen hidden actions.
    if (useSideMenuStore.getState().open) setHistoryMenuId(id);
  };
  const chatOwner = hydrated ? profile?.id ?? null : null;
  useEffect(() => { void initializeChat(chatOwner); }, [chatOwner, initializeChat]);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);
  const clearWishlist = useWishlistStore((s) => s.clear);
  const menuW = width * 0.7;

  useEffect(() => { if (!open) setHistoryMenuId(null); }, [open]);

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
    setHistoryMenuId(null);
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
    if (chatSending || chatLoading) return;
    newChat();
    router.replace('/');
    closeMenu();
  };

  return (
    <MenuDrawer menu={
      <View
        style={[
          styles.panel,
          {
            width: menuW,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.panel,
            borderRightColor: colors.borderSoft,
          },
        ]}
      >
        <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.profileRow} onPress={goProfile}>
          {profile ? (
            <UserAvatar
              name={profile.name}
              picture={profile.picture}
              size={50}
            />
          ) : (
            <View style={styles.guestAvatar}>
              <Image
                source={GOOGLE_LOGO}
                style={styles.guestLogo}
                contentFit="contain"
              />
            </View>
          )}
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
          <View>
            {!listLoading && conversations.some(chat => chat.pinned) && <View style={{marginBottom:16}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:4,marginBottom:8}}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="m16 3 5 5-4 1-3 5v3l-3-3-5 5-1-1 5-5-3-3h3l5-3Z"/></Svg>
                <Text style={{color:colors.text,fontSize:15,fontWeight:'500'}}>{t('menu.pinnedChats')}</Text>
              </View>
              {conversations.filter(chat => chat.pinned).map(chat => <ChatHistoryItem key={chat.id} pinned={Boolean(chat.pinned)} pinError={pinError === chat.id}
              onPin={() => { void setPinned(chat.id, !chat.pinned).then(ok => { if (ok) setHistoryMenuId(null); }); }} title={chat.title} active={activeId === chat.id}
              disabled={chatSending || chatLoading || Boolean(deletingId || pinningId)} deleting={deletingId === chat.id} error={deleteError === chat.id}
              menuOpen={open && historyMenuId === chat.id} onMenu={() => showHistoryMenu(chat.id)} onClose={() => setHistoryMenuId(null)}
              onOpen={() => { setHistoryMenuId(null); void openChat(chat.id); closeMenu(); router.replace('/'); }}
              onDelete={() => { void deleteConversation(chat.id).then(deleted => { if (deleted) setHistoryMenuId(null); }); }}/>) }
            </View>}
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            {t('menu.previousChats')}
          </Text>

            {listLoading && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, paddingHorizontal: 4 }}>{t('common.loading')}</Text>}
            {!listLoading && conversations.filter(chat => !chat.pinned).map(chat => <ChatHistoryItem key={chat.id} pinned={Boolean(chat.pinned)} pinError={pinError === chat.id}
              onPin={() => { void setPinned(chat.id, !chat.pinned).then(ok => { if (ok) setHistoryMenuId(null); }); }} title={chat.title} active={activeId === chat.id}
              disabled={chatSending || chatLoading || Boolean(deletingId || pinningId)} deleting={deletingId === chat.id} error={deleteError === chat.id}
              menuOpen={open && historyMenuId === chat.id} onMenu={() => showHistoryMenu(chat.id)} onClose={() => setHistoryMenuId(null)}
              onOpen={() => { setHistoryMenuId(null); void openChat(chat.id); closeMenu(); router.replace('/'); }}
              onDelete={() => { void deleteConversation(chat.id).then(deleted => { if (deleted) setHistoryMenuId(null); }); }}/>) }
          </View>
        </View>
        </ScrollView>

        <Pressable style={styles.logout} onPress={onLogout}>
          <LogoutIcon size={22} color={colors.icon} />
          <Text style={[styles.logoutText, { color: colors.text }]}>
            {t('common.logout')}
          </Text>
        </Pressable>
      </View>
    }>{children}</MenuDrawer>
  );
}

const styles = StyleSheet.create({
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
  guestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  guestLogo: {
    width: 26,
    height: 26,
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
    paddingBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  logout: {
    flexShrink: 0,
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
