import { colors } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type TextMessageBubbleProps = {
  text: string;
};

export function TextMessageBubble({ text }: TextMessageBubbleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.wrap}>
        <View style={styles.bubble}>
          <Text style={styles.text}>{text}</Text>
        </View>
        <View style={styles.tail}>
          <Svg width={12} height={16} viewBox="0 0 12 16">
            <Path
              d="M0 0 C2 6 4 12 12 16 L0 16 Z"
              fill={colors.accent}
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.accent,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  tail: {
    position: 'absolute',
    right: -7,
    bottom: 0,
  },
});
