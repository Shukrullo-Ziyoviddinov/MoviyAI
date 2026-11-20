import axios from 'axios';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { Profile } from '../models/Profile.js';
import { telegram } from './api.js';
import { avatarSignature } from './security.js';

const MAX_BYTES = 256 * 1024;
type Photo = { file_id: string; file_unique_id?: string; file_size?: number; width: number; height: number };
type Avatar = { bytes: Buffer; mimeType: string };
const defaults = {
  telegram,
  findProfile: (id: string) => Profile.findById(id).select('+telegramPhotoFileId').lean(),
  async download(path: string): Promise<Buffer> {
    const result = await axios.get(`https://api.telegram.org/file/bot${env.telegramBotToken}/${path}`, {
      responseType: 'arraybuffer', timeout: 8000, maxRedirects: 0, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES,
    });
    return Buffer.from(result.data);
  },
};

export function createTelegramAvatarService(deps = defaults) {
  const cache = new Map<string, Avatar & { expires: number }>();
  const pending = new Map<string, Promise<Avatar>>();
  return {
    async profilePicture(telegramId: string, profileId: string, signedPicture: string) {
      const result = await deps.telegram<{ photos: Photo[][] }>('getUserProfilePhotos', { user_id: Number(telegramId), limit: 1 }, { timeoutMs: 4000 });
      const photos = (result.photos?.[0] ?? []).filter(photo => typeof photo.file_id === 'string' && photo.file_id.length <= 2048
        && photo.width > 0 && photo.height > 0 && (photo.file_size ?? 0) <= MAX_BYTES).sort((a, b) => a.width * a.height - b.width * b.height);
      const photo = photos.find(item => Math.min(item.width, item.height) >= 160) ?? photos[0];
      if (!photo) return { picture: signedPicture, clearPhoto: true };
      const version = createHash('sha256').update(photo.file_unique_id || photo.file_id).digest('hex').slice(0, 16);
      return { picture: `${env.publicUrl}/api/telegram/avatar/${profileId}?v=${version}&signature=${avatarSignature(profileId, version)}`, fileId: photo.file_id, clearPhoto: false };
    },
    async read(profileId: string): Promise<Avatar | null> {
      if (!/^[a-f0-9]{24}$/i.test(profileId)) return null;
      const profile = await deps.findProfile(profileId);
      const fileId = profile?.telegramPhotoFileId;
      if (!fileId) return null;
      const saved = cache.get(fileId);
      if (saved && saved.expires > Date.now()) return saved;
      if (pending.has(fileId)) return pending.get(fileId)!;
      if (pending.size >= 8) throw Error('AVATAR_BUSY');
      const work = (async () => {
        const file = await deps.telegram<{ file_path?: string; file_size?: number }>('getFile', { file_id: fileId }, { timeoutMs: 4000 });
        if (!file.file_path || file.file_path.includes('..') || !/^[\w/.-]+$/.test(file.file_path) || (file.file_size ?? 0) > MAX_BYTES) throw Error('AVATAR_INVALID');
        const bytes = await deps.download(file.file_path);
        if (!bytes.length || bytes.length > MAX_BYTES) throw Error('AVATAR_INVALID');
        const mimeType = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
          : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
          : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
        if (!mimeType) throw Error('AVATAR_INVALID');
        const avatar = { bytes, mimeType };
        if (cache.size >= 16) cache.delete(cache.keys().next().value!);
        cache.set(fileId, { ...avatar, expires: Date.now() + 300000 });
        return avatar;
      })();
      pending.set(fileId, work);
      try { return await work; } finally { pending.delete(fileId); }
    },
  };
}
export const telegramAvatar = createTelegramAvatarService();
