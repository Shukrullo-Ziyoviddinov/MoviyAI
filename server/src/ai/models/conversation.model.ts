import { Schema, model } from 'mongoose';
const schema = new Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, default: 'Yangi chat', maxlength: 100 },
    pinned: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
    lockToken: { type: String, default: '' },
    lockUntil: { type: Date, default: new Date(0) },
}, { timestamps: true, collection: 'ai_conversations' });
schema.index({ userId: 1, updatedAt: -1 });
export const Conversation = model('AiConversation', schema);
const turnSchema = new Schema({
    conversationId: { type: String, required: true },
    userId: { type: String, required: true },
    requestId: { type: String, required: true },
    attemptToken: { type: String, default: '' },
    text: { type: String, required: true, maxlength: 20000 },
    answer: { type: String, default: '' },
    model: { type: String, default: '' },
    status: { type: String, enum: ['processing', 'completed', 'failed'], required: true },
}, { timestamps: true, collection: 'ai_chat_turns' });
turnSchema.index({ conversationId: 1, requestId: 1 }, { unique: true });
turnSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });
export const ChatTurn = model('AiChatTurn', turnSchema);
