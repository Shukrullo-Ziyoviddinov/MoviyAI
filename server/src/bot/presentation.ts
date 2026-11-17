import { env } from '../config/env.js';
import type { BotResult } from './ai.js';
import type { InlineButton } from './types.js';

export function botPresentation(result: BotResult, token: string) {
  const rich = !result.telegramSources?.length && !!(result.rich || result.movie || result.recommendations?.length || result.characterImages?.length || /!\[[^\]]*\]\(/.test(result.text));
  const buttons: InlineButton[][] = [];
  if (result.telegramSources?.length) {
    for (const source of result.telegramSources.slice(0, 8)) {
      try {
        const url = new URL(source.url);
        if (url.protocol === 'https:' && !url.username && !url.password) buttons.push([{ text: source.title.slice(0, 60) || url.hostname, url: url.href }]);
      } catch { /* Ignore malformed sources. */ }
    }
    return { rich: false, text: 'Manbalar:', buttons };
  }
  if (rich) {
    const url = new URL(env.telegramWebAppUrl);
    if (url.protocol !== 'https:') throw Error('TELEGRAM_WEB_APP_URL must use HTTPS');
    url.searchParams.set('telegramResult', token);
    buttons.push([{ text: "Natijani ko‘rish", web_app: { url: url.toString() } }]);
    return { rich, text: result.movie ? '🎬 Kino natijasi tayyor.' : '🎬 Natija tayyor.', buttons };
  }
  // Keep ordinary conversation in Telegram, with real source URLs as inline buttons.
  const seen = new Set<string>();
  const text = result.text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, title: string, address: string) => {
    try {
      const url = new URL(address);
      if (url.protocol === 'https:' && !url.username && !url.password && !seen.has(url.href) && seen.size < 8) {
        seen.add(url.href); buttons.push([{ text: title.slice(0, 60) || url.hostname, url: url.href }]);
      }
    } catch { /* Invalid links are not converted to buttons. */ }
    return title;
  }).replace(/\*\*([^*]+)\*\*/g, '$1');
  return { rich, text, buttons };
}
