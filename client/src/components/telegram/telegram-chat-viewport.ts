import type { TelegramViewport } from './telegram-viewport';

/** Chat alone follows the live keyboard viewport; other screens keep their stable layout. */
export function telegramChatHeight(tg: TelegramViewport, fallback: number, visual?: { height: number; offsetTop: number; scale: number } | null) {
  const positive = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const current = positive(tg.viewportHeight) || positive(tg.viewportStableHeight) || positive(fallback);
  const visibleBottom = visual && visual.scale === 1 && positive(visual.height)
    ? visual.height + Math.max(0, Number.isFinite(visual.offsetTop) ? visual.offsetTop : 0) : 0;
  return visibleBottom ? Math.min(current || visibleBottom, visibleBottom) : current;
}
