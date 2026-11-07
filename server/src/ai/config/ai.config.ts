import 'dotenv/config';

export const AI_CONFIG = {
  models: {
    image: "gemini-3.5-flash-lite",
    video: "gemini-3.5-flash-lite",

    text: "gemma-4-26b-a4b-it",
    chat: "gemma-4-26b-a4b-it",
  },

  apiKey: process.env.GOOGLE_AI_API_KEY,
  serperApiKey: process.env.SERPER_API_KEY,
};
