import { ChatTurn, Conversation } from '../models/conversation.model.js';
import { chatImageKey, putChatImage, getChatImage, deleteChatImage, signChatImage } from '../../services/r2.service.js';
import { cleanupExpiredUploads, cleanupReservedImages } from './direct-image.service.js';
import type { ChatImageInput } from '../types/movie-search.types.js';
import { catalogDispatcher } from '../catalog/services/catalog-dispatch.service.js';

export function imageReferences(conversationId: string, requestId: string, images: (ChatImageInput & { hash: string })[]) {
  return images.map((image, index) => ({ key: chatImageKey(conversationId, requestId, index, image.hash),
    mimeType: image.mimeType, hash: image.hash, size: image.data.length }));
}
export async function uploadChatImages(conversationId: string, requestId: string, images: (ChatImageInput & { hash: string })[]) {
  const references = imageReferences(conversationId, requestId, images);
  for (let index = 0; index < images.length; index++) await putChatImage(references[index].key, images[index].data, images[index].mimeType);
}
export async function loadChatImages(userId: string, conversationId: string, requestId: string): Promise<ChatImageInput[]> {
  const turn = await ChatTurn.findOne({ userId, conversationId, requestId }).select('+images.data').lean();
  if (!turn) return [];
  const result: ChatImageInput[] = [];
  for (let index = 0; index < turn.images.length; index++) {
    const image = turn.images[index];
    const expectedKey = chatImageKey(conversationId, requestId, index, image.hash);
    if (image.key && image.key !== expectedKey) throw new Error('INVALID_CHAT_IMAGE_KEY');
    let data: Buffer | null;
    if (image.data) {
      data = Buffer.isBuffer(image.data) ? image.data : Buffer.from(image.data.buffer);
      await putChatImage(expectedKey, data, image.mimeType);
      // Replace legacy bytes only after R2 has accepted the object.
      await ChatTurn.updateOne({ userId, conversationId, requestId }, {
        $set: { [`images.${index}.key`]: expectedKey, [`images.${index}.size`]: data.length },
        $unset: { [`images.${index}.data`]: '' },
      });
      if (!await Conversation.exists({ _id: conversationId, userId, deletedAt: null })) {
        await deleteChatImage(expectedKey);
        throw new Error('Conversation not found');
      }
    } else data = await getChatImage(expectedKey);
    if (!data) throw new Error('Chat image is unavailable. Please attach it again.');
    result.push({ data, mimeType: image.mimeType });
  }
  return result;
}
export async function cleanupConversationImages(userId: string, conversationId: string) {
  await catalogDispatcher.preserveConversation(userId, conversationId);
  await cleanupReservedImages(userId, conversationId);
  const turns = await ChatTurn.find({ userId, conversationId }).select('-images.data').lean();
  for (const turn of turns) for (let index = 0; index < turn.images.length; index++) {
    const image = turn.images[index];
    const key = chatImageKey(conversationId, turn.requestId, index, image.hash);
    if (image.key && image.key !== key) throw new Error('INVALID_CHAT_IMAGE_KEY');
    await deleteChatImage(key);
  }
  // Keep references until every R2 deletion succeeds, so retries cannot lose keys.
  await ChatTurn.deleteMany({ userId, conversationId });
  await Conversation.updateOne({ _id: conversationId, userId, cleanupPending: true }, { $set: { cleanupPending: false } });
}
export async function chatImageUrls(userId: string, conversationId: string, requestId: string,
  savedImages?: Array<{ key?: string | null; hash: string; mimeType: string }>) {
  let images = savedImages ?? (await ChatTurn.findOne({ userId, conversationId, requestId }).select('-images.data').lean())?.images ?? [];
  if (!images.length) return [];
  if (images.some(image => !image.key)) {
    await loadChatImages(userId, conversationId, requestId);
    images = (await ChatTurn.findOne({ userId, conversationId, requestId }).select('-images.data').lean())?.images ?? [];
  }
  return Promise.all(images.map(async (image, index) => {
    const key = chatImageKey(conversationId, requestId, index, image.hash);
    if (image.key !== key) throw new Error('INVALID_CHAT_IMAGE_KEY');
    return { fileUri: await signChatImage(key, 'GET'), mimeType: image.mimeType };
  }));
}
export function startChatImageCleanup() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      try { await cleanupExpiredUploads(); }
      catch { console.warn('[CHAT_IMAGE_CLEANUP] Abandoned upload cleanup pending; will retry'); }
      const rows = await Conversation.find({ cleanupPending: true }).limit(20).lean();
      for (const row of rows) {
        if (!row.deletedAt) continue;
        try { await cleanupConversationImages(row.userId, row._id); }
        catch { console.warn('[CHAT_IMAGE_CLEANUP] R2 cleanup pending; will retry'); }
      }
    } catch { console.warn('[CHAT_IMAGE_CLEANUP] Could not load pending cleanups'); }
    finally { running = false; }
  };
  void run();
  setInterval(() => { void run(); }, 60000).unref();
}
