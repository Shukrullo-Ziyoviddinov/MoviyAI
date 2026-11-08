"use client";
import { Fragment, useState } from 'react';
import { useTheme } from '@/components/theme/theme-state';
import { answerSections, inlineParts, characterForItem } from './answer-format';
import type { CharacterImage } from '@/types/chat';

function CharacterPortrait({ image }: { image: CharacterImage }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={image.imageUrl} alt={image.label} width={56} height={56} loading="lazy" referrerPolicy="no-referrer"
    onError={() => setFailed(true)} className="mt-1 h-14 w-14 shrink-0 rounded-xl object-cover"/>;
}

export function FormattedAnswer({ text, characterImages = [] }: { text: string; characterImages?: CharacterImage[] }) {
  const { colors } = useTheme();
  function inline(value: string) {
    return inlineParts(value).map((part, index) => {
      if (part.kind === 'bold') return <strong key={index} className="font-semibold" style={{ color: colors.text }}>{part.text}</strong>;
      if (part.kind === 'italic') return <em key={index}>{part.text}</em>;
      if (part.kind === 'code') return <code key={index} className="rounded px-1 py-0.5 text-[0.88em]" style={{ backgroundColor: colors.panelSoft, color: colors.accentBright }}>{part.text}</code>;
      if (part.kind === 'link') return <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="underline decoration-1 underline-offset-4" style={{ color: colors.accentBright }}>{part.text}</a>;
      return <Fragment key={index}>{part.text}</Fragment>;
    });
  }
  return <div className="space-y-4 break-words text-[15px] leading-[1.85] tracking-[0.005em]" style={{ color: colors.text, overflowWrap: 'anywhere', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
    {answerSections(text).map(({ block, characterSection }, index) => {
      if (block.kind === 'rule') return <hr key={index} className="my-5 border-0 border-t" style={{ borderColor: colors.borderSoft }}/>;
      if (block.kind === 'heading') {
        const Heading = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
        return <Heading key={index} className="flex items-start gap-2.5 pt-2 font-bold leading-snug tracking-tight" style={{ fontSize: block.level! <= 2 ? 21 : 18 }}><span aria-hidden="true" className="mt-[0.2em] h-[1em] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: colors.accentBright }}/><span>{inline(block.text)}</span></Heading>;
      }
      if (block.kind === 'list') {
        const List = block.ordered ? 'ol' : 'ul';
        return <List key={index} {...(block.ordered ? { start: block.start } : {})} className="space-y-3">
          {block.items.map((item, position) => { const portrait = characterSection ? characterForItem(item, characterImages) : undefined; return <li key={position} className="flex items-start gap-3">
            {portrait ? <CharacterPortrait key={portrait.imageUrl} image={portrait}/> : <span aria-hidden="true" className={block.ordered ? 'mt-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums' : 'mt-[0.8em] h-1.5 w-1.5 shrink-0 rounded-full'} style={{ backgroundColor: block.ordered ? colors.panelSoft : colors.accentBright, color: colors.accentBright }}>{block.ordered ? block.start + position : ''}</span>}
            <span className="min-w-0 flex-1 whitespace-pre-wrap">{inline(item)}</span>
          </li>; })}
        </List>;
      }
      if (block.kind === 'quote') return <blockquote key={index} className="border-l-2 pl-4 italic" style={{ borderColor: colors.accentBright, color: colors.textMuted }}>{inline(block.text)}</blockquote>;
      if (block.kind === 'code') return <pre key={index} className="overflow-x-auto rounded-xl border p-3 text-[13px] leading-6" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}><code>{block.text}</code></pre>;
      return <p key={index} className="whitespace-pre-wrap">{inline(block.text)}</p>;
    })}
  </div>;
}
