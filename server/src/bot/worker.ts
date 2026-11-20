import { randomBytes, randomUUID } from 'node:crypto';
import { BotSession, BotUpdate } from './models.js';
import { sendTelegramMessage, TelegramError } from './api.js';
import { telegramMedia } from './media.js';
import { answerBot, type BotResult } from './ai.js';
import { botPresentation } from './presentation.js';
import { publishResult } from './results.js';
import { runChatOperation } from '../ai/utils/chat-operation.js';
import { ChatFailure, chatFailureCode } from '../ai/types/chat-progress.types.js';
import { isCatalogEligible } from '../ai/catalog/utils/catalog-chat-input.js';
import { drainBotCatalog } from './catalog.js';
import type { AiHistoryMessage } from '../ai/types/ai.types.js';
import type { TelegramUpdate } from './types.js';
import { createBotProgress } from './progress.js';
import { findMovieFromVideoUrl, hasVideoPlatformLink } from '../ai/video-import/services/video-import-chat.service.js';

const CONCURRENCY = 2;
let running = 0;
let interval: ReturnType<typeof setInterval> | undefined;
export async function acceptUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!Number.isSafeInteger(update.update_id) || update.update_id < 0 || !message?.from || !Number.isSafeInteger(message.from.id) || message.from.id <= 0 || message.from.is_bot || message.chat.type !== 'private' || message.chat.id !== message.from.id) return;
  if (!message.text && !message.photo?.length && !message.video && !message.document) return;
  if ((message.text ?? message.caption ?? '').length > 20000) return;
  const telegramId = String(message.from.id);
  await BotSession.updateOne({ _id: telegramId }, { $setOnInsert: { history: [] } }, { upsert: true });
  try {
    await BotUpdate.updateOne({ _id: String(update.update_id) }, { $setOnInsert: {
      telegramId, update, resultToken: randomBytes(32).toString('hex'), conversationId: randomUUID(),
    } }, { upsert: true });
  } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  void drainBotQueue();
}
function failureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'BOT_MEDIA_TOO_LARGE') return 'Telegram bot orqali 20 MB gacha fayl yuboring. Kattaroq video uchun Moviy AI ilovasidan foydalaning.';
  if (message === 'BOT_VIDEO_DURATION') return '3 daqiqagacha bo‘lgan videoni video sifatida yuboring.';
  if (message === 'BOT_MEDIA_FORMAT') return 'Ushbu fayl formati qo‘llanmaydi. JPG, PNG rasm yoki MP4 video yuboring.';
  const code = chatFailureCode(error);
  if (code === 'video_prepare_timeout') return 'Videoni tayyorlash uchun ajratilgan vaqt tugadi. Qisqaroq video yoki boshqa havola yuboring.';
  if (code === 'provider_unavailable') return 'AI xizmatida vaqtinchalik muammo. Qayta urinib ko‘ring.';
  if (code === 'timeout') return 'Tahlil uchun ajratilgan vaqt tugadi. Qisqaroq parcha bilan qayta urinib ko‘ring.';
  if (code === 'identity_unconfirmed' || code === 'insufficient_evidence') return 'Ushbu parchadan kinoni ishonchli aniqlab bo‘lmadi. Boshqa sahnani yuboring.';
  return 'So‘rovni yakunlab bo‘lmadi. Qayta urinib ko‘ring.';
}
export async function drainBotQueue() {
  if (running >= CONCURRENCY) return;
  running++;
  try {
    for (let count = 0; count < 10; count++) {
      const now = new Date(), lockToken = randomUUID();
      const job = await BotUpdate.findOneAndUpdate({ status: { $in: ['pending', 'processing', 'ready'] }, lockUntil: { $lte: now }, nextAttemptAt: { $lte: now } }, {
        $set: { lockToken, lockUntil: new Date(Date.now() + 300000) },
      }, { sort: { createdAt: 1 }, returnDocument: 'after' }).lean();
      if (!job) break;
      const earlier = await BotUpdate.exists({ telegramId: job.telegramId, status: { $in: ['pending', 'processing', 'ready'] },
        'update.message.message_id': { $lt: job.update.message?.message_id ?? 0 },
      });
      if (earlier) {
        await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { lockUntil: new Date(0), nextAttemptAt: new Date(Date.now() + 10000) } });
        continue;
      }
      const session = await BotSession.findOneAndUpdate({ _id: job.telegramId, lockUntil: { $lte: now } }, {
        $set: { lockToken, lockUntil: new Date(Date.now() + 300000) },
      }, { returnDocument: 'after' }).lean();
      if (!session) {
        await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { lockUntil: new Date(0), nextAttemptAt: new Date(Date.now() + 10000) } });
        continue;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new ChatFailure('timeout')), hasVideoPlatformLink(job.update.message?.text ?? job.update.message?.caption ?? '') ? 600000 : 220000);
      let renewing = false;
      const heartbeat = setInterval(() => {
        if (renewing) return;
        renewing = true;
        void Promise.all([
          BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { lockUntil: new Date(Date.now() + 300000) } }),
          BotSession.updateOne({ _id: job.telegramId, lockToken }, { $set: { lockUntil: new Date(Date.now() + 300000) } }),
        ]).then(rows => { if (rows.some(row => row.matchedCount === 0)) controller.abort(new ChatFailure('stopped')); })
          .catch(() => controller.abort(new ChatFailure('unknown'))).finally(() => { renewing = false; });
      }, 30000);
      heartbeat.unref();
      let notice = job.notification;
      let progress: ReturnType<typeof createBotProgress> | undefined;
      try {
        const incoming = (job.update as TelegramUpdate).message;
        const hasMedia = !!(incoming?.video || incoming?.photo?.length || incoming?.document);
        const immediateCommand = /^\/(?:start|help|new)(?:@\w+)?(?:\s|$)/.test(incoming?.text?.trim() ?? '');
        if (job.progressMessageId || !notice && !immediateCommand) {
          progress = createBotProgress(Number(job.telegramId), {
            messageId: job.progressMessageId,
            typing: !hasMedia,
            save: async messageId => { await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { progressMessageId: messageId } }); },
          });
          if (!notice) await progress.start(!hasMedia ? 'preparing' : incoming?.video || incoming?.document?.mime_type?.startsWith('video/') ? 'checking_video' : 'analyzing_image');
        }
        if (!notice) {
          // Each update owns a durable UI conversation ID from acceptUpdate.
          // Telegram context stays in the session; separate results must never
          // share its UI thread. Retries keep the same update-owned ID.
          await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { status: 'processing' }, $inc: { attempts: 1 } });
          const update = job.update as TelegramUpdate;
          const text = (update.message?.text ?? update.message?.caption ?? '').trim();
          let result: BotResult;
          if (/^\/(?:start|help)(?:@\w+)?(?:\s|$)/.test(text)) {
            result = { text: 'Salom! Kino yoki serial haqida savol yozing, rasm yoki 3 daqiqagacha video yuboring. Kino izlash natijasini “Natijani ko‘rish” tugmasi orqali ochasiz.', model: 'bot-help' };
          } else if (/^\/new(?:@\w+)?$/.test(text)) {
            await BotSession.updateOne({ _id: job.telegramId, lockToken }, { $set: { history: [], movie: null, conversationId: randomUUID() } });
            result = { text: 'Yangi suhbat boshlandi. Qanday kino izlayapsiz?', model: 'bot-help' };
          } else {
            result = await runChatOperation({ signal: controller.signal, checkpoints: {}, save: async () => {} }, async () => {
              const imported = await findMovieFromVideoUrl({kind:'telegram',id:job.telegramId},job.conversationId,`telegram-${job._id}`,text,{
                signal:controller.signal,onProgress:progress?.report,hasMedia,
                onImport:async videoImportId=>{
                  const saved=await BotUpdate.updateOne({_id:job._id,lockToken},{$set:{videoImportId}});
                  if(!saved.matchedCount)throw new ChatFailure('stopped');
                },
              });
              if(imported)return imported;
              const media = await telegramMedia(job._id, update);
              return answerBot(text || 'Ushbu kinoni top', media, session.history as AiHistoryMessage[], session.movie ?? undefined, progress?.report);
            });
          }
          controller.signal.throwIfAborted();
          notice = botPresentation(result, job.resultToken);
          // Persist response before sending: a Telegram delivery retry never reruns AI.
          const catalogPending = !hasVideoPlatformLink(text) && (isCatalogEligible(result.movie) || !!result.recommendations?.some(item => isCatalogEligible(item.movie)) || !!result.movie?.linksOnly);
          const written = await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { result, resultAt: new Date(), notification: notice, status: 'ready', catalogPending } });
          if (written.matchedCount === 0) continue;
          if (catalogPending) void drainBotCatalog();
        }
        const saved = await BotUpdate.findById(job._id).lean();
        await progress?.finish(saved?.result ? '✅ Natija tayyor.' : '❗ So‘rov yakunlanmadi.');
        if (saved?.result) {
          const result = saved.result as BotResult;
          if (notice.rich && session.profileId) await publishResult(job._id, session.profileId)
            .catch(() => { console.warn('[TELEGRAM_AI]', { event: 'ui-publish-deferred' }); });
          const text = (job.update.message?.text ?? job.update.message?.caption ?? '').trim();
          // Build history from durable update IDs to make delivery retries idempotent.
          const history = (session.history as Array<AiHistoryMessage & { updateId?: string }>).filter(item => item.updateId !== job._id);
          const modelText = result.movie?.title ? `${result.text}\nIdentified film: ${result.movie.title} (${result.movie.year ?? ''})`
            : `${result.text}${result.recommendations?.length ? '\nRecommended films: ' + result.recommendations.map(item => `${item.movie.title} (${item.movie.year ?? ''})`).join('; ') : ''}`;
          if (result.model !== 'bot-help') history.push({ role: 'user', text: text || 'Kino tasviri yuborildi', updateId: job._id }, { role: 'model', text: modelText, updateId: job._id });
          await BotSession.updateOne({ _id: job.telegramId, lockToken }, { $set: {
            ...(result.model !== 'bot-help' ? { history: history.slice(-20) } : {}),
            ...(result.movie ? { movie: result.movie } : result.recommendations?.length ? { movie: result.recommendations.length === 1 ? result.recommendations[0].movie : null } : {}),
          } });
        }
        if (!await BotUpdate.exists({ _id: job._id, lockToken })) continue;
        await sendTelegramMessage(Number(job.telegramId), notice.text, notice.buttons, {
          start: saved?.deliveredParts ?? 0,
          onSent: async parts => {
            const updated = await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { deliveredParts: parts } });
            if (updated.matchedCount === 0) throw new ChatFailure('stopped');
          },
        });
        await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { status: 'sent', lockUntil: new Date(0) } });
        await progress?.remove();
      } catch (error) {
        console.warn('[TELEGRAM_AI]', { event: 'request-failed', failureCode: chatFailureCode(error) });
        await progress?.finish(notice ? '📨 Natija tayyor. Yuborish qayta urinilmoqda…' : `❗ ${failureMessage(error)}`);
        if (error instanceof TelegramError && [400, 403].includes(error.status)) {
          await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { status: 'failed', lockUntil: new Date(0) } });
          continue;
        }
        if (!notice) {
          notice = { rich: false, text: failureMessage(error), buttons: [] };
          await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { notification: notice, status: 'ready' } });
        }
        const delay = error instanceof TelegramError ? error.retryAfter * 1000 : 30000;
        await BotUpdate.updateOne({ _id: job._id, lockToken }, { $set: { nextAttemptAt: new Date(Date.now() + delay), lockUntil: new Date(0) } });
      } finally {
        progress?.dispose();
        clearTimeout(timer); clearInterval(heartbeat);
        await BotSession.updateOne({ _id: job.telegramId, lockToken }, { $set: { lockToken: '', lockUntil: new Date(0) } });
      }
    }
  } catch { console.warn('[TELEGRAM_AI]', { event: 'queue-deferred' }); }
  finally { running--; }
}
export function startBotWorker() {
  if (interval) return;
  interval = setInterval(() => { void drainBotCatalog(); for (let index = 0; index < CONCURRENCY; index++) void drainBotQueue(); }, 15000);
  interval.unref();
  void drainBotCatalog();
  for (let index = 0; index < CONCURRENCY; index++) void drainBotQueue();
}
