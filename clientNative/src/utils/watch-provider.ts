/** Only public video pages; never arbitrary URLs or provider login endpoints. */
export function watchProvider(value: string) {
  try {
    const u = new URL(value), host = u.hostname.replace(/^www\./, '');
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const vk = /^\/video(-?\d+)_(\d+)\/?$/.exec(u.pathname);
    if (['vkvideo.ru', 'vk.com', 'vk.ru'].includes(host) && vk)
      return { provider: 'vk', url: `https://vkvideo.ru/video${vk[1]}_${vk[2]}`, owner: vk[1], id: vk[2] };
    const ok = /^\/video\/(\d+)\/?$/.exec(u.pathname);
    if (host === 'ok.ru' && ok) return { provider: 'ok', url: `https://ok.ru/video/${ok[1]}`, id: ok[1] };
    const mover = /^\/watch\/([A-Za-z0-9]+)\/?$/.exec(u.pathname);
    if (host === 'mover.uz' && mover) return { provider: 'mover', url: `https://mover.uz/watch/${mover[1]}/`, id: mover[1] };
  } catch { /* Invalid URL. */ }
  return null;
}

export function verifiedEmbed(page: string, value: string) {
  const source = watchProvider(page);
  if (!source) return null;
  try {
    const u = new URL(value), host = u.hostname.replace(/^www\./, '');
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (source.provider === 'vk' && ['vkvideo.ru', 'vk.com', 'vk.ru'].includes(host)
      && u.pathname === '/video_ext.php' && u.searchParams.get('oid') === source.owner && u.searchParams.get('id') === source.id) return u.href;
    if (source.provider === 'ok' && host === 'ok.ru' && u.pathname === `/videoembed/${source.id}`) return u.href;
    if (source.provider === 'mover' && host === 'mover.uz' && u.pathname === `/video/embed/${source.id}`) return u.href;
  } catch { /* Invalid embed. */ }
  return null;
}
