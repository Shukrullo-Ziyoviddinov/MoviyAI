export type ChatMediaItem = {
  id: string;
  uri: string;
  type: "image" | "video";
  width?: number;
  height?: number;
};

export type TextChatMessage = {
  id: string;
  kind: "text";
  text: string;
  createdAt: number;
};

export type MediaChatMessage = {
  id: string;
  kind: "media";
  items: ChatMediaItem[];
  createdAt: number;
};

export type ChatMessage = TextChatMessage | MediaChatMessage;
