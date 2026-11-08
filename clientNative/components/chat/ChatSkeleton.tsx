import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

export function ChatSkeleton() {
  const { t } = useTranslation();
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} style={{ width: '100%', paddingHorizontal: 14, gap: 32 }}>
    {[0, 1, 2].map(group => <View key={group} accessible={false}>
      <SkeletonLoader width="42%" height={44} borderRadius={18} style={{ alignSelf: 'flex-end', marginBottom: 24, maxWidth: 240 }} />
      <View style={{ gap: 12 }}>
        {(['96%', '100%', '82%', '57%'] as const).map((width, index) => <SkeletonLoader key={index} width={width} height={14} borderRadius={6} />)}
      </View>
    </View>)}
  </View>;
}
