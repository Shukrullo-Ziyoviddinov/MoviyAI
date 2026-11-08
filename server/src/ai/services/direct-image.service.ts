import { Schema, model } from 'mongoose';
import { Conversation, ChatTurn } from '../models/conversation.model.js';
import { chatImageKey, signChatImage, inspectChatImage, deleteChatImage } from '../../services/r2.service.js';

const uploadsSchema = new Schema({
  userId: { type: String, required: true }, conversationId: { type: String, required: true },
  requestId: { type: String, required: true }, images: { type: [{ key: String, hash: String, size: Number, mimeType: String }], required: true },
  expiresAt: { type: Date, required: true },
}, { collection: 'ai_chat_uploads', timestamps: true });
uploadsSchema.index({ conversationId: 1, requestId: 1 }, { unique: true });
uploadsSchema.index({ expiresAt: 1 }); // No TTL: cleanup must delete R2 objects first.
export const ChatUpload = model('AiChatUpload', uploadsSchema);
export type UploadDescriptor = { hash: string; size: number; mimeType: string };
export async function reserveImages(userId: string, conversationId: string, requestId: string, images: UploadDescriptor[]) {
  if (!await Conversation.exists({ _id: conversationId, userId, deletedAt: null })) throw new Error('Conversation not found');
  const references = images.map((image, index) => ({ ...image, key: chatImageKey(conversationId, requestId, index, image.hash) }));
  const turn = await ChatTurn.findOne({ userId, conversationId, requestId }).lean();
  if (turn && JSON.stringify(turn.images.map(image => image.hash)) !== JSON.stringify(images.map(image => image.hash))) throw new Error('Attachments already selected');
  await ChatUpload.updateOne({ userId, conversationId, requestId }, { $setOnInsert: { images: references, expiresAt: new Date(Date.now() + 3600000) } }, { upsert: true });
  const reservation = await ChatUpload.findOne({ userId, conversationId, requestId }).lean();
  if (!reservation || reservation.expiresAt <= new Date() || JSON.stringify(reservation.images.map(image => [image.hash,image.size,image.mimeType])) !== JSON.stringify(images.map(image => [image.hash,image.size,image.mimeType]))) throw new Error('Upload reservation expired or changed');
  // Never issue a PUT that can outlive its cleanup reservation.
  const lifetime = Math.min(300, Math.floor((reservation.expiresAt.getTime() - Date.now()) / 1000) - 60);
  if (lifetime < 1) throw new Error('Upload reservation expired');
  return Promise.all(references.map(async image => ({ url: await signChatImage(image.key, 'PUT', image.mimeType, image.size, lifetime),
    headers: { 'Content-Type': image.mimeType, 'Cache-Control': 'private, no-store' } })));
}
export async function resolveDirectImages(userId: string, conversationId: string, requestId: string) {
  const reservation = await ChatUpload.findOne({ userId, conversationId, requestId }).lean();
  if (!reservation || reservation.expiresAt <= new Date()) throw new Error('Upload reservation expired');
  for (const image of reservation.images) {
    if (!image.key || !image.hash || !image.mimeType || !image.size) throw new Error('Invalid image metadata');
    const file = await inspectChatImage(image.key);
    if (file.size !== image.size || file.mimeType !== image.mimeType) throw new Error('Invalid image size or type');
    const bytes = file.bytes;
    const valid = image.mimeType === 'image/jpeg' ? bytes.subarray(0,3).equals(Buffer.from([255,216,255]))
      : image.mimeType === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : image.mimeType === 'image/webp' && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
    if (!valid) throw new Error('Invalid image content');
  }
  return reservation.images.map(image => ({ key: image.key!, hash: image.hash!, mimeType: image.mimeType!, size: image.size! }));
}
export async function cleanupExpiredUploads() {
  const rows = await ChatUpload.find({ expiresAt: { $lte: new Date() } }).limit(20).lean();
  for (const row of rows) {
    try {
    // An in-flight send may still be moving these references into a turn.
    if (await Conversation.exists({ _id: row.conversationId, userId: row.userId, deletedAt: null, lockUntil: { $gt: new Date() } })) continue;
    const active = await Conversation.exists({ _id: row.conversationId, userId: row.userId, deletedAt: null });
    const turn = active ? await ChatTurn.findOne({ userId: row.userId, conversationId: row.conversationId, requestId: row.requestId }).select('-images.data').lean() : null;
    for (const image of row.images) if (image.key && !turn?.images.some(saved => saved.key === image.key)) await deleteChatImage(image.key);
    await ChatUpload.deleteOne({ _id: row._id });
    } catch { console.warn('[CHAT_IMAGE_CLEANUP] Reserved upload cleanup pending; will retry'); }
  }
}
export async function cleanupReservedImages(userId: string, conversationId: string) {
  const rows = await ChatUpload.find({ userId, conversationId }).lean();
  for (const row of rows) for (const image of row.images) if (image.key) await deleteChatImage(image.key);
  // Retain reservations until expiry: an already-issued PUT URL may still be used.
  // The expiry worker repeats deletion, preventing late uploads from becoming orphans.
}
