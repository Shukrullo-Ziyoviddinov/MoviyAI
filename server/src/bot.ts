// Compatibility entry point. Telegram implementation lives in src/bot/.
export { attachTelegramBot, connectTelegramBot } from './bot/index.js';
export { sendTelegramMessage } from './bot/api.js';
