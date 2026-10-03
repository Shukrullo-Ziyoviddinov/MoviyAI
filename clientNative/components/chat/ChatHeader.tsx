import { CloseIcon, DownloadIcon, MenuIcon, PersonIcon } from '@/components/icons';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HEADER_ROW_HEIGHT = 62;

export function ChatHeader() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const item = useMediaViewerStore((state) => state.item);
  const close = useMediaViewerStore((state) => state.close);
  const openMenu = useSideMenuStore((state) => state.openMenu);
  const viewing = !!item;

  const handleDownload = async () => {
    if (!item) return;

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t('common.error'), t('chat.downloadUnavailable'));
        return;
      }
      await Sharing.shareAsync(item.uri);
    } catch {
      Alert.alert(t('common.error'), t('chat.downloadFailed'));
    }
  };

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]} pointerEvents="box-none">
      <View style={styles.row}>
        <Pressable
          style={[
            styles.circleBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.border },
          ]}
          onPress={viewing ? close : openMenu}
        >
          {viewing ? (
            <CloseIcon size={22} color={colors.icon} />
          ) : (
            <MenuIcon size={22} color={colors.icon} />
          )}
        </Pressable>

        <Pressable
          style={[
            styles.circleBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.border },
          ]}
          onPress={viewing ? handleDownload : () => router.push('/profile')}
        >
          {viewing ? (
            <DownloadIcon size={20} color={colors.icon} />
          ) : (
            <PersonIcon size={20} color={colors.icon} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  row: {
    height: HEADER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
