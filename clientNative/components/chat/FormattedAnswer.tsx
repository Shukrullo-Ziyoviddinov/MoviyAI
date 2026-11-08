import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/stores/useThemeStore';
import { answerSections, inlineParts, characterForItem, withoutSourceCitations } from './answer-format';
import { useState } from 'react';
import { Image } from 'expo-image';
import type { CharacterImage } from '@/src/types/chat';

function CharacterPortrait({ image }: { image: CharacterImage }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image source={{ uri: image.imageUrl }} accessibilityLabel={image.label} contentFit="cover" onError={()=>setFailed(true)}
    style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, marginTop: 3 }}/>;
}

export function FormattedAnswer({ text, characterImages = [], hideCitations = false }: { text: string; characterImages?: CharacterImage[]; hideCitations?: boolean }) {
  const { colors } = useTheme();
  function inline(value: string) {
    return inlineParts(value).map((part, index) => <Text key={index}
      accessibilityRole={part.kind === 'link' ? 'link' : undefined}
      onPress={part.href ? () => { void Linking.openURL(part.href!).catch(() => undefined); } : undefined}
      style={part.kind === 'bold' ? styles.bold : part.kind === 'italic' ? styles.italic
        : part.kind === 'code' ? [styles.codeInline, { color: colors.accentBright, backgroundColor: colors.panelSoft }]
        : part.kind === 'link' ? { color: colors.accentBright, textDecorationLine: 'underline' } : undefined}>{part.text}</Text>);
  }
  return <View style={styles.content}>
    {answerSections(hideCitations ? withoutSourceCitations(text) : text).map(({ block, characterSection, portraitKind }, index) => {
      if (block.kind === 'rule') return <View key={index} style={{ height: 1, backgroundColor: colors.borderSoft, marginVertical: 4 }}/>;
      if (block.kind === 'heading') { return <View key={index} style={styles.headingRow}>
        <View style={{ width: 3, height: block.level! <= 2 ? 21 : 18, borderRadius: 3, marginTop: 5, backgroundColor: colors.accentBright }}/>
        <Text selectable accessibilityRole="header" style={[styles.body, styles.heading, { color: colors.text, fontSize: block.level! <= 2 ? 21 : 18 }]}>{inline(block.text)}</Text>
      </View>; }
      if (block.kind === 'list') return <View key={index} style={styles.list}>
        {block.items.map((item, position) => { const portrait = characterSection ? characterForItem(item, characterImages.filter(image=>(image.kind ?? 'character')===portraitKind)) : undefined; return <View key={position} style={styles.listRow}>
          {portrait ? <CharacterPortrait key={portrait.imageUrl} image={portrait}/> : block.ordered ? <View style={[styles.number, { backgroundColor: colors.panelSoft }]}><Text style={{ color: colors.accentBright, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{block.start + position}</Text></View>
            : <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 11, backgroundColor: colors.accentBright }}/>}
          <Text selectable style={[styles.body, { flex: 1, color: colors.text }]}>{inline(item)}</Text>
        </View>; })}
      </View>;
      if (block.kind === 'quote') return <View key={index} style={{ borderLeftWidth: 2, borderLeftColor: colors.accentBright, paddingLeft: 16 }}><Text selectable style={[styles.body, styles.italic, { color: colors.textMuted }]}>{inline(block.text)}</Text></View>;
      if (block.kind === 'code') return <ScrollView key={index} horizontal style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.panelSoft }} contentContainerStyle={{ padding: 12 }}><Text selectable style={[styles.codeInline, { color: colors.text, lineHeight: 22 }]}>{block.text}</Text></ScrollView>;
      return <Text key={index} selectable style={[styles.body, { color: colors.text }]}>{inline(block.text)}</Text>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 16 },
  body: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }), fontSize: 15, lineHeight: 28, letterSpacing: 0.075 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 8 },
  heading: { flex: 1, fontWeight: '700', lineHeight: 29, letterSpacing: -0.35 },
  list: { gap: 12 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  number: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 4, marginTop: 3, alignItems: 'center', justifyContent: 'center' },
  codeInline: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13 },
});
