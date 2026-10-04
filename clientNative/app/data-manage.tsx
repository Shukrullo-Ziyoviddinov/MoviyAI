import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  BookmarkIcon,
  ChatBubbleIcon,
  ChevronLeftIcon,
  GalleryIcon,
  SearchIcon,
} from '@/components/icons';
import { DataManageRow } from '@/components/settings/DataManageRow';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionKey = 'chats' | 'searches' | 'media' | 'favorites';

const ACTIONS: {
  key: ActionKey;
  titleKey: string;
  subtitleKey: string;
  modalTitleKey: string;
  modalBodyKey: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
  danger: boolean;
}[] = [
  {
    key: 'chats',
    titleKey: 'dataManage.chatsTitle',
    subtitleKey: 'dataManage.chatsSub',
    modalTitleKey: 'dataManage.chatsModalTitle',
    modalBodyKey: 'dataManage.chatsModalBody',
    Icon: ChatBubbleIcon,
    iconColor: '#F87171',
    iconBg: 'rgba(239, 68, 68, 0.16)',
    danger: true,
  },
  {
    key: 'searches',
    titleKey: 'dataManage.searchesTitle',
    subtitleKey: 'dataManage.searchesSub',
    modalTitleKey: 'dataManage.searchesModalTitle',
    modalBodyKey: 'dataManage.searchesModalBody',
    Icon: SearchIcon,
    iconColor: '#FBBF24',
    iconBg: 'rgba(245, 158, 11, 0.16)',
    danger: true,
  },
  {
    key: 'media',
    titleKey: 'dataManage.mediaTitle',
    subtitleKey: 'dataManage.mediaSub',
    modalTitleKey: 'dataManage.mediaModalTitle',
    modalBodyKey: 'dataManage.mediaModalBody',
    Icon: GalleryIcon,
    iconColor: '#A78BFA',
    iconBg: 'rgba(109, 40, 217, 0.18)',
    danger: true,
  },
  {
    key: 'favorites',
    titleKey: 'dataManage.favoritesTitle',
    subtitleKey: 'dataManage.favoritesSub',
    modalTitleKey: 'dataManage.favoritesModalTitle',
    modalBodyKey: 'dataManage.favoritesModalBody',
    Icon: BookmarkIcon,
    iconColor: '#F472B6',
    iconBg: 'rgba(219, 39, 119, 0.16)',
    danger: true,
  },
];

export default function DataManageScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<ActionKey | null>(null);

  const current = ACTIONS.find((a) => a.key === active) ?? null;

  const handleConfirm = () => {
    // Keyin real delete/view logikasi ulanadi
    setActive(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={[
              styles.backBtn,
              { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            ]}
            onPress={() => router.back()}
          >
            <ChevronLeftIcon size={20} color={colors.icon} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('dataManage.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('dataManage.subtitle')}
          </Text>
        </View>

        <View style={styles.list}>
          {ACTIONS.map((action) => (
            <DataManageRow
              key={action.key}
              title={t(action.titleKey)}
              subtitle={t(action.subtitleKey)}
              Icon={action.Icon}
              iconColor={action.iconColor}
              iconBg={action.iconBg}
              onPress={() => setActive(action.key)}
            />
          ))}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={!!current}
        title={current ? t(current.modalTitleKey) : ''}
        message={current ? t(current.modalBodyKey) : ''}
        confirmLabel={t('common.yes')}
        cancelLabel={t('common.no')}
        danger={current?.danger ?? true}
        onConfirm={handleConfirm}
        onCancel={() => setActive(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 10,
    paddingHorizontal: 16,
  },
});
