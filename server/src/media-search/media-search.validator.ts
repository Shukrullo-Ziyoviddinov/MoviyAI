import { z } from 'zod';
import { CHAT_VIDEO } from '../ai/config/chat-video.config.js';

export const searchId = z.string().uuid();
export const searchUpload = z.object({
  id: searchId, kind: z.enum(['image', 'video']),
  hash: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().min(12), mimeType: z.string(),
}).strict().superRefine((input, context) => {
  const valid = input.kind === 'image'
    ? input.size <= 4 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(input.mimeType)
    : input.size >= 16 && input.size <= CHAT_VIDEO.maxBytes && CHAT_VIDEO.mimeTypes.includes(input.mimeType as typeof CHAT_VIDEO.mimeTypes[number]);
  if (!valid) context.addIssue({ code: 'custom', message: 'Invalid media size or format' });
});
export function validSearchImage(mime: string, bytes: Buffer) {
  return mime === 'image/jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
