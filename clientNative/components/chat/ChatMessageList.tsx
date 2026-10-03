import { MediaGridBlock } from '@/components/chat/MediaGridBlock';
import { TextMessageBubble } from '@/components/chat/TextMessageBubble';
import type { ChatMessage } from '@/src/types/chat';
import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';

type ChatMessageListProps = {
  messages: ChatMessage[];
  topInset?: number;
  bottomInset?: number;
};

export function ChatMessageList({
  messages,
  topInset = 0,
  bottomInset = 0,
}: ChatMessageListProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 8, paddingBottom: bottomInset },
      ]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) =>
        item.kind === 'text' ? (
          <TextMessageBubble text={item.text} />
        ) : (
          <MediaGridBlock items={item.items} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
