export interface AiHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AiTextRequest {
  text: string;
  history?: AiHistoryMessage[];
}

export interface AiMediaInput {
  mimeType: string;
  data: Buffer;
}

export interface AiMediaRequest extends AiTextRequest {
  media: AiMediaInput[];
}

export interface AiResult {
  text: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}
