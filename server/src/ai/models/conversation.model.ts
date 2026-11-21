import { Schema, model } from 'mongoose';
const schema = new Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, default: 'Yangi chat', maxlength: 100 },
    titleGenerated: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
    cleanupPending: { type: Boolean, default: false },
    cleanupAttempts: { type: Number, default: 0 },
    cleanupNextAttemptAt: { type: Date, default: new Date(0) },
    lockToken: { type: String, default: '' },
    activeRequestId:{type:String,default:''},
    lockUntil: { type: Date, default: new Date(0) },
}, { timestamps: true, collection: 'ai_conversations' });
schema.index({ userId: 1, updatedAt: -1 });
export const Conversation = model('AiConversation', schema);
const turnSchema = new Schema({
    conversationId: { type: String, required: true },
    userId: { type: String, required: true },
    requestId: { type: String, required: true },
    attemptToken: { type: String, default: '' },
    origin: { type: String, enum: ['ui', 'telegram'], default: 'ui' },
    text: { type: String, default: '', required: function(this: { origin?: string }) { return this.origin !== 'telegram'; }, maxlength: 20000 },
    images: { type: [new Schema({
        mimeType: { type: String, required: true },
        key: { type: String },
        size: { type: Number },
        hash: { type: String, required: true },
        // Compatibility only: old uploads migrate to R2 when accessed.
        data: { type: Buffer, select: false },
    }, { _id: false })], default: [] },
    movie: { type: Schema.Types.Mixed, default: null },
    videoImportId: { type: String, default: null, select: false },
    videos:{type:[new Schema({key:{type:String,required:true},hash:{type:String,required:true},mimeType:{type:String,required:true},size:{type:Number,required:true},duration:{type:Number,required:true}},{_id:false})],default:[]},
    characterImages: { type: Schema.Types.Mixed, default: [] },
    recommendations: {type:Schema.Types.Mixed,default:[]},
    popularityRetryAt: { type: Date, default: new Date(0), select: false },
    popularityPending: { type: Boolean, default: false, select: false },
    catalogDispatch: { type: String, enum: ['none', 'pending', 'queued'], default: 'none', select: false },
    answer: { type: String, default: '' },
    answerAt:{type:Date,default:null},
    resumeEvents:{type:[new Schema({id:{type:String,required:true},text:{type:String,required:true},createdAt:{type:Date,required:true}},{_id:false})],default:[]},
    progressStage:{type:String,default:null},
    failureCode:{type:String,default:null},
    checkpoints:{type:Schema.Types.Mixed,default:{},select:false},
    attachmentKind:{type:String,enum:['image','video',null],default:null},
    model: { type: String, default: '' },
    status: { type: String, enum: ['processing', 'completed', 'failed', 'stopped'], required: true },
}, { timestamps: true, collection: 'ai_chat_turns' });
turnSchema.index({ conversationId: 1, requestId: 1 }, { unique: true });
turnSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });
turnSchema.index({ popularityPending: 1, popularityRetryAt: 1, createdAt: 1 });
turnSchema.index({ catalogDispatch: 1, status: 1, createdAt: 1 });
export const ChatTurn = model('AiChatTurn', turnSchema);
