import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/src/stores/useThemeStore';

export function AiError({ message, onRetry, disabled = false }: {
  message: string; onRetry: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return <View style={{ width: '100%', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View accessible={false} style={{ paddingTop: 2 }}>
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="#d99a37" strokeWidth={1.7}>
          <Path d="M10.3 4.1 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
          <Path d="M12 9v4" strokeLinecap="round" /><Circle cx={12} cy={16.5} r={0.8} fill="#d99a37" stroke="none" />
        </Svg>
      </View>
      <Text accessibilityRole="alert" style={{ flex: 1, color: colors.textMuted, fontSize: 14, lineHeight: 24 }}>{message}</Text>
    </View>
    <Pressable onPress={onRetry} disabled={disabled} accessibilityRole="button" accessibilityLabel="Qayta urinish"
      style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 12, marginLeft: 31, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.accentBright} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 7v5h-5M19.1 15a7.5 7.5 0 1 1-.7-7.6L20 12" />
      </Svg>
      <Text style={{ color: colors.accentBright, fontSize: 14, fontWeight: '500' }}>Qayta urinish</Text>
    </Pressable>
  </View>;
}
