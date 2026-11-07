import { randomUUID } from 'node:crypto';
import { Conversation, ChatTurn } from '../models/conversation.model.js';
import { chatWithGemma } from './gemma.service.js';
import type { AiHistoryMessage } from '../types/ai.types.js';
export class ConversationError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
}
export async function listConversations(userId: string) {
    const rows = await Conversation.find({ userId, deletedAt: null }).sort({ updatedAt: -1 }).select('_id title pinned updatedAt').lean();
    return rows.map(row => ({ id: row._id, title: row.title, pinned: Boolean(row.pinned), updatedAt: row.updatedAt }));
}
export async function createConversation(userId: string, id: string) {
    const existing = await Conversation.findById(id).lean();
    if (existing && (existing.userId !== userId || existing.deletedAt))
        throw new ConversationError('Conversation not found', 404);
    try {
        await Conversation.updateOne({ _id: id, userId }, { $setOnInsert: { title: 'Yangi chat' } }, { upsert: true });
    }
    catch (error) {
        if ((error as {
            code?: number;
        }).code !== 11000)
            throw error;
        if (!await Conversation.exists({ _id: id, userId, deletedAt: null }))
            throw new ConversationError('Conversation not found', 404);
    }
    return getConversation(userId, id);
}
export async function getConversation(userId: string, id: string) {
    const row = await Conversation.findOne({ _id: id, userId, deletedAt: null }).lean();
    if (!row)
        throw new ConversationError('Conversation not found', 404);
    const turns = await ChatTurn.find({ conversationId: id, userId }).sort({ createdAt: 1, _id: 1 }).lean();
    return {
        id: row._id, title: row.title, pinned: Boolean(row.pinned), updatedAt: row.updatedAt,
        turns: turns.map(turn => ({
            requestId: turn.requestId, text: turn.text, answer: turn.answer,
            status: turn.status === 'processing' && row.lockUntil <= new Date() ? 'failed' : turn.status,
            createdAt: turn.createdAt, model: turn.model,
        })),
    };
}
export async function sendConversationMessage(userId: string, id: string, requestId: string, text: string, onDelta?: (text: string) => void) {
    const existing = await ChatTurn.findOne({ userId, conversationId: id, requestId }).lean();
    if (existing && existing.text !== text)
        throw new ConversationError('Request ID already used for another message', 409);
    if (existing?.status === 'completed')
        return getConversation(userId, id);
    const lockToken = randomUUID();
    const locked = await Conversation.findOneAndUpdate({
        _id: id, userId, deletedAt: null, lockUntil: { $lte: new Date() },
    }, { $set: { lockToken, lockUntil: new Date(Date.now() + 90000) } }, { new: true });
    if (!locked) {
        if (!await Conversation.exists({ _id: id, userId, deletedAt: null }))
            throw new ConversationError('Conversation not found', 404);
        throw new ConversationError('Conversation is processing another message', 409);
    }
    try {
        // Recheck after acquiring the lock to avoid replaying a just-completed request.
        const replay = await ChatTurn.findOne({ userId, conversationId: id, requestId }).lean();
        if (replay && replay.text !== text)
            throw new ConversationError('Request ID already used for another message', 409);
        if (replay?.status === 'completed')
            return getConversation(userId, id);
        // A later message must not bypass an unanswered earlier message.
        if (await ChatTurn.exists({ userId, conversationId: id, requestId: { $ne: requestId }, status: { $ne: 'completed' } })) {
            throw new ConversationError('Retry the unanswered message before sending another', 409);
        }
        await ChatTurn.updateOne({ conversationId: id, userId, requestId }, {
            $set: { status: 'processing', attemptToken: lockToken }, $setOnInsert: { text },
        }, { upsert: true });
        await Conversation.updateOne({ _id: id, userId, lockToken }, {
            $set: { title: locked.title === 'Yangi chat' ? text.slice(0, 100) : locked.title },
        });
        const previous = await ChatTurn.find({ userId, conversationId: id, status: 'completed' })
            .sort({ createdAt: -1, _id: -1 }).limit(15).lean();
        const history: AiHistoryMessage[] = previous.reverse().flatMap(turn => [
            { role: 'user' as const, text: turn.text }, { role: 'model' as const, text: turn.answer },
        ]);
        const result = await chatWithGemma({ text, history }, onDelta);
        await ChatTurn.updateOne({ conversationId: id, userId, requestId, attemptToken: lockToken }, {
            $set: { status: 'completed', answer: result.text, model: result.model },
        });
    }
    catch (error) {
        await ChatTurn.updateOne({ conversationId: id, userId, requestId, attemptToken: lockToken, status: 'processing' }, { $set: { status: 'failed' } });
        throw error;
    }
    finally {
        await Conversation.updateOne({ _id: id, userId, lockToken }, { $set: { lockToken: '', lockUntil: new Date(0) } });
    }
    return getConversation(userId, id);
}

export async function deleteConversation(userId: string, id: string) {
 const row=await Conversation.findOne({_id:id,userId}).lean();
 if(!row)throw new ConversationError('Conversation not found',404);
 if(!row.deletedAt){
  const removed=await Conversation.findOneAndUpdate({_id:id,userId,deletedAt:null,lockUntil:{$lte:new Date()}},
   {$set:{deletedAt:new Date(),title:'',lockToken:'',lockUntil:new Date(0)}},{new:true});
  if(!removed)throw new ConversationError('Conversation is busy. Try again later.',409);
 }
 // Keep only an empty tombstone so a delayed create retry cannot resurrect a deleted chat.
 await ChatTurn.deleteMany({conversationId:id,userId});
 return {id};
}

export async function pinConversation(userId: string, id: string, pinned: boolean) {
    const row = await Conversation.findOneAndUpdate({ _id: id, userId, deletedAt: null },
        { $set: { pinned } }, { new: true });
    if (!row) throw new ConversationError('Conversation not found', 404);
    return { id: row._id, pinned: Boolean(row.pinned) };
}
