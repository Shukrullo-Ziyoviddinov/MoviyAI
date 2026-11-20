type Insets = { top?: number; bottom?: number };
export type TelegramViewport = {
  viewportStableHeight?: number;
  viewportHeight?: number;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
};

export function telegramViewportLayout(tg: TelegramViewport, fallbackHeight: number) {
  const positive = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  return {
    height: positive(tg.viewportStableHeight) || positive(tg.viewportHeight) || positive(fallbackHeight),
    bottom: positive(tg.safeAreaInset?.bottom) + positive(tg.contentSafeAreaInset?.bottom),
  };
}
