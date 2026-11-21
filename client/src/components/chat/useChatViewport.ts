"use client";
import { useEffect, type RefObject } from 'react';
import { chatViewportLayout } from './chat-viewport';

/** Keep the chat viewport separate from message scrolling and browser focus panning. */
export function useChatViewport(root: RefObject<HTMLElement | null>, telegram: boolean) {
  useEffect(() => {
    const element = root.current, parent = element?.parentElement;
    if (!element || !parent) return;
    const tg = telegram ? window.Telegram?.WebApp : undefined;
    const viewport = window.visualViewport;
    const keys = ['--chat-viewport-height', '--chat-viewport-top', '--chat-composer-bottom', '--chat-viewport-left', '--chat-viewport-width'];
    const previous = keys.map(key => element.style.getPropertyValue(key));
    const transition = element.style.transition;
    let frame = 0, restingHeight = parent.clientHeight || window.innerHeight;
    const apply = () => {
      const bounds = parent.getBoundingClientRect();
      const layout = chatViewportLayout({ telegram: tg, parentHeight: parent.clientHeight,
        windowHeight: window.innerHeight, restingHeight, visual: viewport });
      if (!layout.keyboardOpen) restingHeight = layout.height;
      element.style.setProperty('--chat-viewport-height', `${layout.height}px`);
      element.style.setProperty('--chat-viewport-top', `${layout.top}px`);
      element.style.setProperty('--chat-viewport-left', `${bounds.left}px`);
      element.style.setProperty('--chat-viewport-width', `${bounds.width}px`);
      element.style.setProperty('--chat-composer-bottom', layout.bottomPadding === null ? 'max(10px, env(safe-area-inset-bottom, 0px))' : `${layout.bottomPadding}px`);
      // Modern clients stream visual-viewport updates. Only old clients need a fallback transition.
      element.style.transition = !layout.visual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'height 160ms ease-out, top 160ms ease-out' : transition;
    };
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
    const reset = () => { restingHeight = 0; update(); };
    update();
    tg?.onEvent?.('viewportChanged', update);
    tg?.onEvent?.('safeAreaChanged', update);
    tg?.onEvent?.('contentSafeAreaChanged', update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('orientationchange', reset);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    element.addEventListener('focusin', update);
    element.addEventListener('focusout', update);
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => {
      cancelAnimationFrame(frame);
      tg?.offEvent?.('viewportChanged', update);
      tg?.offEvent?.('safeAreaChanged', update);
      tg?.offEvent?.('contentSafeAreaChanged', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', reset);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      element.removeEventListener('focusin', update);
      element.removeEventListener('focusout', update);
      observer.disconnect();
      keys.forEach((key, index) => { if (previous[index]) element.style.setProperty(key, previous[index]); else element.style.removeProperty(key); });
      element.style.transition = transition;
    };
  }, [root, telegram]);
}
