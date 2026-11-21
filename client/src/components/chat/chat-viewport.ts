import type { TelegramViewport } from '../telegram/telegram-viewport';

type VisualArea = { height: number; offsetTop: number; scale: number };
export function chatViewportLayout(input: { telegram?: TelegramViewport; parentHeight: number; windowHeight: number; restingHeight: number; visual?: VisualArea | null }) {
  const positive = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const tg = input.telegram;
  const hostHeight = positive(tg?.viewportStableHeight) || Math.max(positive(input.parentHeight), positive(input.windowHeight));
  const fullHeight = Math.max(positive(input.restingHeight), hostHeight);
  const visual = input.visual && input.visual.scale === 1 && positive(input.visual.height) ? input.visual : null;
  // The visual viewport leads keyboard animation; Telegram's current height can arrive late.
  const height = visual ? Math.min(fullHeight || visual.height, visual.height)
    : Math.min(fullHeight || Infinity, positive(tg?.viewportHeight) || positive(input.windowHeight) || fullHeight);
  const visualTop = visual && Number.isFinite(visual.offsetTop) ? Math.max(0, visual.offsetTop) : 0;
  const keyboardOpen = fullHeight - height > 120;
  return {
    height, top: visualTop, keyboardOpen,
    // Never add Telegram/system insets on top of the keyboard or count them twice.
    bottomPadding: keyboardOpen ? 8 : tg ? Math.max(8, positive(tg.safeAreaInset?.bottom), positive(tg.contentSafeAreaInset?.bottom)) : null,
    visual: !!visual,
  };
}
