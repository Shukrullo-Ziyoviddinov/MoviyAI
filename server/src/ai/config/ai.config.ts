import 'dotenv/config';

export const AI_CONFIG = {
  models: {
    image: "gemini-3.5-flash-lite",
    video: "gemini-3.5-flash-lite",

    text: "gemma-4-31b-it",
    chat: "gemma-4-31b-it",
  },

  apiKey: process.env.GOOGLE_AI_API_KEY,
  serperApiKey: process.env.SERPER_API_KEY,
};
