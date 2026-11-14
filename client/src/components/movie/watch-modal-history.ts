/** Own one history entry without closing a modal underneath this one. */
export function watchModalHistory(onBack: () => void, target: Window = window) {
  let active = true;
  let closing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    active = false;
    clearTimeout(timer);
    target.removeEventListener('popstate', onPop, true);
  };
  const onPop = (event: PopStateEvent) => {
    event.stopImmediatePropagation();
    cleanup();
    onBack();
  };
  target.history.pushState({ moviyWatchModal: true }, '');
  target.addEventListener('popstate', onPop, true);
  return () => {
    if (!active || closing) return;
    closing = true;
    target.history.back();
    timer = setTimeout(cleanup, 1500);
  };
}
