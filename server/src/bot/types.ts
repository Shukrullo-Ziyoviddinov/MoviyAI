export type TelegramMedia = { file_id: string; file_size?: number; mime_type?: string; duration?: number };
export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; is_bot?: boolean };
    chat: { id: number; type: string };
    text?: string;
    caption?: string;
    photo?: TelegramMedia[];
    video?: TelegramMedia;
    document?: TelegramMedia;
  };
};
export type InlineButton = { text: string; url?: string; web_app?: { url: string } };
