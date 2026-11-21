/** Scroll updates only check waiting sections; no page-wide React state updates. */
export function createDeferredViewport(initialBottom: number) {
  let bottom = initialBottom;
  const waiting = new Map<object, { top: number; reveal: () => void }>();
  return {
    watch(top: number, reveal: () => void) {
      const key = {};
      if (top <= bottom) reveal();
      else waiting.set(key, { top, reveal });
      return () => { waiting.delete(key); };
    },
    update(nextBottom: number) {
      bottom = nextBottom;
      for (const [key, section] of waiting) {
        if (section.top <= bottom) {
          waiting.delete(key);
          section.reveal();
        }
      }
    },
  };
}
export type DeferredViewport = ReturnType<typeof createDeferredViewport>;
