"use client";
import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/theme-state';
import { useT } from '@/i18n/useT';

type Props = {
  pinned: boolean; onPin: () => void; pinError: boolean;
  title: string; active: boolean; disabled: boolean; deleting: boolean; error: boolean;
  menuOpen: boolean; onMenu: () => void; onClose: () => void;
  onOpen: () => void; onDelete: () => void;
};
export function ChatHistoryItem(props: Props) {
  const { colors } = useTheme(); const t = useT();
  const { menuOpen, onClose } = props;
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef({x:0,y:0}); const held = useRef(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!menuOpen) return;
    menuButton.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if(event.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menuOpen, onClose]);
  return <div ref={root} className="mb-1">
    <button type="button" disabled={props.disabled} aria-haspopup="menu" aria-expanded={props.menuOpen}
      className="flex w-full items-center gap-2 truncate rounded-xl px-3 py-2 text-left text-sm select-none"
      style={{ color: colors.textMuted, backgroundColor: props.active ? colors.panelSoft : undefined, WebkitTouchCallout: 'none' }} title={props.title}
      onPointerDown={event => { if(event.button!==0)return; held.current=false; origin.current={x:event.clientX,y:event.clientY};
        timer.current=setTimeout(()=>{held.current=true;props.onMenu();},500); }}
      onPointerMove={event=>{if(Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>8)cancel();}}
      onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onContextMenu={event=>{event.preventDefault();cancel();held.current=true;if(!props.disabled)props.onMenu();}}
      onKeyDown={event=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();props.onMenu();}}}
      onClick={()=>{if(held.current){held.current=false;return;}props.onOpen();}}>
      {props.pinned && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z" strokeLinejoin="round"/><path d="M7 8h9M7 12h6" strokeLinecap="round"/></svg>}
      <span className="truncate">{props.title}</span></button>
    {props.menuOpen && <div role="menu" className="mt-1 rounded-xl border p-1 shadow-lg" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
      <button ref={menuButton} type="button" role="menuitem" disabled={props.disabled} onClick={props.onPin}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium disabled:opacity-40" style={{color:colors.text}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-4 1-3 5v3l-3-3-5 5-1-1 5-5-3-3h3l5-3Z"/>{props.pinned && <path d="m3 3 18 18"/>}</svg>
        {t(props.pinned?'common.unpin':'common.pin')}
      </button>
      <button type="button" role="menuitem" disabled={props.disabled || props.deleting}
        onClick={props.onDelete} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/>
        </svg>{t(props.deleting ? 'common.deleting' : 'common.delete')}
      </button>
      {props.error && <p role="alert" className="px-3 py-2 text-xs text-red-500">{t('menu.deleteChatError')}</p>}
      {props.pinError && <p role="alert" className="px-3 py-2 text-xs text-red-500">{t('menu.pinChatError')}</p>}
    </div>}
  </div>;
}
