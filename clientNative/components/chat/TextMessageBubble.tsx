import { useTheme } from '@/src/stores/useThemeStore';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MovieSearchResult } from '@/src/types/chat';
import { MovieSearchCard } from './MovieSearchCard';
import { FormattedAnswer } from './FormattedAnswer';

type TextMessageBubbleProps = {
  text: string;
  role?: 'user' | 'model';
  movie?: MovieSearchResult | null;
};

export function TextMessageBubble({ text, role = 'user', movie }: TextMessageBubbleProps) {
  const { colors } = useTheme();

  if (role === 'model') return <View style={styles.answer}><FormattedAnswer text={text}/>{movie && <MovieSearchCard movie={movie}/>}</View>;

  return (
    <View style={styles.row}>
      <View style={styles.wrap}>
        <View style={[styles.bubble, { backgroundColor: colors.accent }]}>
          <Text style={[styles.text, { color: colors.textOnAccent }]}>{text}</Text>
        </View>
        <View style={styles.tail}>
          <Svg width={12} height={16} viewBox="0 0 12 16">
            <Path d="M0 0 C2 6 4 12 12 16 L0 16 Z" fill={colors.accent} />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { width: '100%', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20 },
  row: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  wrap: {
    maxWidth: '78%',
    position: 'relative',
  },
  bubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  tail: {
    position: 'absolute',
    right: -7,
    bottom: 0,
  },
});
