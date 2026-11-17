import { Conversation, ChatTurn } from '../ai/models/conversation.model.js';
import { wakeCatalogWorker } from '../ai/catalog/services/catalog-worker.service.js';
import { BotUpdate, BotSession } from './models.js';
import { telegramUser } from './security.js';
import type { BotResult } from './ai.js';

export async function publishResult(jobId: string, profileId: string) {
  const job = await BotUpdate.findById(jobId).lean();
  if (!job?.result || !job.notification?.rich) throw Error('RESULT_NOT_FOUND');
  if (job.publishedProfileId && job.publishedProfileId !== profileId) throw Error('RESULT_FORBIDDEN');
  const result = job.result as BotResult;
  const existing = await Conversation.findById(job.conversationId).lean();
  if (existing && (existing.userId !== profileId || existing.deletedAt)) throw Error('RESULT_NOT_FOUND');
  const title = (result.movie?.titleUz || result.movie?.title || result.text.replace(/[*#]/g, '').split('\n')[0] || 'Telegram natijasi').slice(0, 100);
  try {
    await Conversation.updateOne({ _id: job.conversationId, userId: profileId }, { $setOnInsert: { title, titleGenerated: true } }, { upsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000 || !await Conversation.exists({ _id: job.conversationId, userId: profileId, deletedAt: null })) throw error;
  }
  // Only the AI response enters the UI history. Incoming Telegram text/media stays private.
  const turnKey = { conversationId: job.conversationId, userId: profileId, requestId: `telegram-${jobId}` };
  try { await ChatTurn.updateOne(turnKey, {
    $setOnInsert: { origin: 'telegram', text: '', answer: result.text, answerAt: job.resultAt ?? job.createdAt, status: 'completed', model: result.model,
      movie: result.movie ?? null, recommendations: result.recommendations ?? [], characterImages: result.characterImages ?? [],
      images: [], videos: [], catalogDispatch: 'none' },
  }, { upsert: true }); } catch (error) {
    if ((error as { code?: number }).code !== 11000 || !await ChatTurn.exists(turnKey)) throw error;
  }
  await BotUpdate.updateOne({ _id: jobId }, { $set: { publishedProfileId: profileId } });
  try { wakeCatalogWorker(); } catch { /* The persisted outbox is retried by the catalog worker. */ }
  return job.conversationId;
}
export async function claimResult(profileId: string, token: string, initData: string) {
  const telegramId = telegramUser(initData);
  if (!telegramId || !/^[a-f0-9]{64}$/.test(token)) throw Error('RESULT_FORBIDDEN');
  const job = await BotUpdate.findOne({ resultToken: token, telegramId }).lean();
  if (!job?.result || !job.notification?.rich) throw Error('RESULT_NOT_FOUND');
  const session = await BotSession.findOneAndUpdate({ _id: telegramId, $or: [{ profileId: null }, { profileId }] }, { $set: { profileId } }, { returnDocument: 'after' });
  if (!session) throw Error('RESULT_FORBIDDEN');
  return publishResult(job._id, profileId);
}
