// Small, text-only Markdown subset. HTML is always rendered as literal text.
export type InlinePart = { kind: 'text' | 'bold' | 'italic' | 'code' | 'link'; text: string; href?: string };
export function isCharacterHeading(text: string) {
  return /^(?:asosiy qahramonlar|main characters|главные герои|основные персонажи)\s*[:：]?$/i.test(text.trim());
}
export function characterForItem<T extends {label: string}>(item: string, images: T[]) {
  const label = /^(?:\*\*|__)([^*_]+)(?:\*\*|__)/.exec(item)?.[1]?.replace(/[:：]\s*$/, '').trim().toLowerCase();
  return label ? images.find(image => image.label.trim().toLowerCase() === label) : undefined;
}
export function answerSections(text: string) {
  let characterSection = false;
  return answerBlocks(text).map(block => {
    if (block.kind === 'heading') characterSection = isCharacterHeading(block.text);
    return { block, characterSection };
  });
}
export type AnswerBlock =
  | { kind: 'heading' | 'paragraph' | 'quote' | 'code'; text: string; level?: number }
  | { kind: 'rule' }
  | { kind: 'list'; ordered: boolean; start: number; items: string[] };

export function safeAnswerLink(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^\s)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    if (index > cursor) parts.push({ kind: 'text', text: text.slice(cursor, index) });
    const value = match[0];
    if (value.startsWith('`')) parts.push({ kind: 'code', text: value.slice(1, -1) });
    else if (value.startsWith('**') || value.startsWith('__')) parts.push({ kind: 'bold', text: value.slice(2, -2) });
    else if (value.startsWith('[')) {
      const link = /^\[([^\]]+)\]\((.+)\)$/.exec(value)!;
      const href = safeAnswerLink(link[2]);
      parts.push({ kind: href ? 'link' : 'text', text: link[1], ...(href ? { href } : {}) });
    } else parts.push({ kind: 'italic', text: value.slice(1, -1) });
    cursor = index + value.length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', text: text.slice(cursor) });
  return parts;
}
export function answerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') }); paragraph = []; };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('```')) {
      flush(); const content: string[] = [];
      while (++index < lines.length && !lines[index].trim().startsWith('```')) content.push(lines[index]);
      blocks.push({ kind: 'code', text: content.join('\n') }); continue;
    }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { flush(); blocks.push({ kind: 'rule' }); continue; }
    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);
    const boldHeading = /^(?:\*\*([^*]+)\*\*|__([^_]+)__)$/.exec(line);
    if (heading || boldHeading) {
      flush(); blocks.push({ kind: 'heading', text: heading ? heading[2] : boldHeading![1] ?? boldHeading![2], level: heading ? heading[1].length : 3 }); continue;
    }
    const item = /^(?:([-+*])\s+|(\d+)[.)]\s+)(.+)$/.exec(line);
    if (item) {
      flush(); const ordered = !!item[2]; const previous = blocks.at(-1);
      if (previous?.kind === 'list' && previous.ordered === ordered && index > 0 && lines[index - 1].trim()) previous.items.push(item[3]);
      else blocks.push({ kind: 'list', ordered, start: ordered ? Number(item[2]) : 1, items: [item[3]] });
      continue;
    }
    if (line.startsWith('> ')) { flush(); blocks.push({ kind: 'quote', text: line.slice(2) }); continue; }
    // Preserve wrapped list descriptions rather than splitting them into paragraphs.
    const previous = blocks.at(-1);
    if (/^\s{2,}\S/.test(lines[index]) && previous?.kind === 'list' && !paragraph.length) previous.items[previous.items.length - 1] += '\n' + line;
    else paragraph.push(line);
  }
  flush(); return blocks;
}
