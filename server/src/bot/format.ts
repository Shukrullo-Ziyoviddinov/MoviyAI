export type TelegramTextEntity = { type: 'bold' | 'italic' | 'code'; offset: number; length: number };

/** Plain text plus UTF-16 entities: AI HTML can never become Telegram markup. */
export function formatTelegramText(input: string) {
  let text = '';
  const entities: TelegramTextEntity[] = [];
  function inline(value: string, depth = 0, insideCode = false) {
    if (depth > 8 || insideCode) { text += value; return; }
    let index = 0;
    while (index < value.length) {
      if (value[index] === '\\' && /[*_`#\\]/.test(value[index + 1] ?? '')) {
        text += value[index + 1]; index += 2; continue;
      }
      const marker = ['***', '**', '__', '`', '*', '_'].find(item => value.startsWith(item, index));
      if (!marker || marker === '_' && /[\p{L}\p{N}]/u.test(value[index - 1] ?? '')) {
        text += value[index++]; continue;
      }
      const end = value.indexOf(marker, index + marker.length);
      if (end <= index + marker.length || marker === '_' && /[\p{L}\p{N}]/u.test(value[end + 1] ?? '')) {
        text += value[index++]; continue;
      }
      const start = text.length;
      const body = value.slice(index + marker.length, end);
      if (marker !== '`' && body.trim() !== body) { text += value[index++]; continue; }
      // A code span is literal, and is never nested inside emphasis entities.
      if (marker === '`') text += body;
      else inline(body, depth + 1);
      const type = marker === '`' ? 'code' : marker.length >= 2 ? 'bold' : 'italic';
      if (type === 'code' && depth > 0) { /* outer emphasis is sufficient */ }
      else entities.push({ type, offset: start, length: text.length - start });
      if (marker === '***') entities.push({ type: 'italic', offset: start, length: text.length - start });
      index = end + marker.length;
    }
  }
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  let fence = false;
  for (const [index, original] of lines.entries()) {
    if (/^\s*```/.test(original)) { fence = !fence; continue; }
    let line = original;
    const heading = !fence && /^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (heading) line = heading[1];
    else if (!fence) line = line.replace(/^(\s*)[-*+]\s+/, '$1• ');
    const start = text.length;
    inline(line, 0, fence);
    if (heading && text.length > start) {
      // Code entities cannot overlap bold in Telegram.
      for (let i = entities.length - 1; i >= 0; i--) if (entities[i].offset >= start && entities[i].type === 'code') entities.splice(i, 1);
      entities.push({ type: 'bold', offset: start, length: text.length - start });
    }
    if (index < lines.length - 1) text += '\n';
  }
  return { text, entities: entities.filter((item, index, all) => item.length > 0 && all.findIndex(other => other.type === item.type && other.offset === item.offset && other.length === item.length) === index) };
}

export function entitiesForChunk(entities: TelegramTextEntity[], offset: number, length: number) {
  return entities.flatMap(entity => {
    const start = Math.max(offset, entity.offset), end = Math.min(offset + length, entity.offset + entity.length);
    return end > start ? [{ ...entity, offset: start - offset, length: end - start }] : [];
  });
}
