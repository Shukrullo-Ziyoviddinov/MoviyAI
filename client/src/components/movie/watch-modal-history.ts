/** Own one history entry without closing a modal underneath this one. */
const modalStacks = new WeakMap<Window, object[]>();
export function watchModalHistory(onBack: () => void, target: Window = window) {
  const stack = modalStacks.get(target) ?? [];
  modalStacks.set(target, stack);
  const entry = {};
  stack.push(entry);
  let active = true;
  let closing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    active = false;
    clearTimeout(timer);
    target.removeEventListener('popstate', onPop, true);
    const index = stack.indexOf(entry);
    if (index >= 0) stack.splice(index, 1);
    if (!stack.length) modalStacks.delete(target);
  };
  const onPop = (event: PopStateEvent) => {
    // Capture listeners run in registration order; the oldest modal must yield.
    if (stack[stack.length - 1] !== entry) return;
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
