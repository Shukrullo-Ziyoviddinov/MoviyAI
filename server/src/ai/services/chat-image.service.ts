import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ChatTurn, Conversation } from '../models/conversation.model.js';
import { chatImageUrls } from './chat-image-storage.service.js';

export function imagePath(userId: string, conversationId: string, requestId: string, index: number) {
  const token = jwt.sign({ purpose: 'chat-image', conversationId, requestId }, env.jwtSecret, { subject: userId, expiresIn: '1h' });
  return `/api/ai/conversations/${conversationId}/messages/${requestId}/images/${index}?token=${token}`;
}
export async function readChatImage(conversationId: string, requestId: string, index: number, token: string) {
  let userId: string;
  try {
    const claims = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (claims.purpose !== 'chat-image' || claims.conversationId !== conversationId || claims.requestId !== requestId || !claims.sub) return null;
    userId = claims.sub;
  } catch { return null; }
  if (!await Conversation.exists({ _id: conversationId, userId, deletedAt: null })) return null;
  const turn = await ChatTurn.findOne({ conversationId, requestId, userId }).select('-images.data').lean();
  if (!Number.isInteger(index) || index < 0 || !turn?.images[index]) return null;
  const images = await chatImageUrls(userId, conversationId, requestId);
  if (!await Conversation.exists({ _id: conversationId, userId, deletedAt: null })) return null;
  return images[index] ?? null;
}
