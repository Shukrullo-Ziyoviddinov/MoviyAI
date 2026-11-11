import { ChatTurn } from '../../models/conversation.model.js';
import { CatalogSaveJob } from '../models/catalog-job.model.js';
import { catalogChatInput, catalogJobId, isCatalogEligible } from '../utils/catalog-chat-input.js';
import type { MovieSearchResult } from '../../types/movie-search.types.js';
import type { CatalogChatInput } from '../types/catalog-job.types.js';

interface OutboxTurn { id: string; conversationId: string; requestId: string; movie: MovieSearchResult; portraits: CatalogChatInput['actorImages'] & Array<{kind?:string}>;recommendations?:Array<{movie:MovieSearchResult;characterImages?:Array<{label:string;imageUrl:string;sourceUrl:string|null;kind?:string}>}> }
export interface CatalogOutboxRepository {
  pending(scope: { userId?: string; conversationId?: string }, limit: number): Promise<OutboxTurn[]>;
  enqueue(id: string, input: CatalogChatInput): Promise<void>;
  markQueued(turnId: string): Promise<void>;
}
const mongoOutbox: CatalogOutboxRepository = {
  async pending(scope, limit) {
    const turns = await ChatTurn.find({ ...scope, status: 'completed', catalogDispatch: 'pending' }).select('_id conversationId requestId movie characterImages recommendations').sort({ createdAt: 1 }).limit(limit).lean();
    return turns.map(turn => ({ id: String(turn._id), conversationId: turn.conversationId, requestId: turn.requestId, movie: turn.movie, portraits: turn.characterImages ?? [],recommendations:turn.recommendations??[] }));
  },
  async enqueue(id, input) {
    try { await CatalogSaveJob.updateOne({ _id: id }, { $setOnInsert: { input, status: 'pending', attempts: 0, nextAttemptAt: new Date() } }, { upsert: true }); }
    catch (error) { if ((error as {code?:number}).code !== 11000) throw error; }
  },
  async markQueued(turnId) { await ChatTurn.updateOne({ _id: turnId, catalogDispatch: 'pending' }, { $set: { catalogDispatch: 'queued' } }); },
};
export function createCatalogDispatcher(repository: CatalogOutboxRepository = mongoOutbox) {
  async function dispatch(scope: { userId?: string; conversationId?: string } = {}, limit = 20) {
    const turns = await repository.pending(scope, limit);
    for (const turn of turns) {
      if (isCatalogEligible(turn.movie)) await repository.enqueue(catalogJobId(turn.conversationId, turn.requestId), catalogChatInput(turn.movie, turn.portraits));
      for(const [index,item] of (turn.recommendations??[]).entries())if(isCatalogEligible(item.movie))
        await repository.enqueue(catalogJobId(turn.conversationId,`${turn.requestId}:recommendation:${index}`),catalogChatInput(item.movie,item.characterImages??[]));
      await repository.markQueued(turn.id);
    }
    return turns.length;
  }
  return { dispatch, async preserveConversation(userId: string, conversationId: string) {
    // Copy public film evidence to an independent job before chat deletion.
    // No chat text, signed user-upload URLs or image bytes enter the job input.
    while (await dispatch({ userId, conversationId }, 50) === 50) { /* Drain all remaining outbox rows. */ }
  } };
}
export const catalogDispatcher = createCatalogDispatcher();
