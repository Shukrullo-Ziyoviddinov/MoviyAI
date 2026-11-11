import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/requireAuth.js';
import * as service from '../services/conversation.service.js';
import { AiServiceError } from '../services/google-ai.service.js';
import { readChatImage } from '../services/chat-image.service.js';
import { reserveImages } from '../services/direct-image.service.js';
import {reserveVideo} from '../services/direct-video.service.js';
import {CHAT_VIDEO} from '../config/chat-video.config.js';
const idSchema = z.string().uuid();
async function respond(res: Response, work: () => Promise<unknown>) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        res.json({ ok: true, data: await work() });
    }
    catch (error) {
        if (error instanceof service.ConversationError)
            res.status(error.status).json({ ok: false, error: error.message });
        else if (error instanceof AiServiceError)
            res.status(error.status === 429 ? 429 : 502).json({ ok: false, error: 'AI response could not be generated. Please retry.' });
        else
            throw error;
    }
}
export async function list(req: Request, res: Response) {
    await respond(res, () => service.listConversations((req as AuthRequest).userId));
}
export async function create(req: Request, res: Response) {
    const input = z.object({ id: idSchema }).strict().safeParse(req.body);
    if (!input.success) {
        res.status(400).json({ ok: false, error: 'Invalid conversation ID' });
        return;
    }
    await respond(res, () => service.createConversation((req as AuthRequest).userId, input.data.id));
}
export async function get(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
        res.status(400).json({ ok: false, error: 'Invalid conversation ID' });
        return;
    }
    await respond(res, () => service.getConversation((req as AuthRequest).userId, id.data));
}
export async function remove(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) { res.status(400).json({ ok: false, error: 'Invalid conversation ID' }); return; }
    await respond(res, () => service.deleteConversation((req as AuthRequest).userId, id.data));
}
export async function pin(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    const input = z.object({ pinned: z.boolean() }).strict().safeParse(req.body);
    if (!id.success || !input.success) { res.status(400).json({ ok: false, error: 'Invalid pin input' }); return; }
    await respond(res, () => service.pinConversation((req as AuthRequest).userId, id.data, input.data.pinned));
}
export async function send(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    const input = z.object({ requestId: idSchema, text: z.string().trim().min(1).max(20000), directImages: z.boolean().optional(),directVideo:z.boolean().optional() }).strict().refine(value=>!(value.directImages&&value.directVideo)).safeParse(req.body);
    if (!id.success || !input.success) {
        res.status(400).json({ ok: false, error: 'Invalid chat input' });
        return;
    }
    const files = Array.isArray(req.files) ? req.files : [];
    const images = files.map(file => ({ mimeType: file.mimetype, data: file.buffer }));
    if (images.reduce((sum, image) => sum + image.data.length, 0) > 8 * 1024 * 1024) {
        res.status(413).json({ ok: false, error: 'Images exceed 8 MB total' }); return;
    }
    for (const image of images) {
        const bytes = image.data;
        const valid = image.mimeType === 'image/jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
            : image.mimeType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : image.mimeType === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!valid) { res.status(415).json({ ok: false, error: 'Invalid image content' }); return; }
    }
    if (req.get('Accept')?.includes('text/event-stream')) {
        res.status(200).set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, no-transform',
            'X-Accel-Buffering': 'no',
        });
        res.flushHeaders();
        const write = (event: unknown) => {
            if (!res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
        };
        const heartbeat = setInterval(() => {
            if (!res.destroyed && !res.writableEnded) res.write(': keepalive\n\n');
        }, 15_000);
        res.once('close', () => clearInterval(heartbeat));
        try {
            const chat = await service.sendConversationMessage((req as AuthRequest).userId, id.data,
                input.data.requestId, input.data.text, text => write({ type: 'delta', text }), images, input.data.directImages,input.data.directVideo);
            write({ type: 'done', data: chat });
        } catch (error) {
            const status = error instanceof service.ConversationError ? error.status
                : error instanceof AiServiceError && error.status === 429 ? 429 : 502;
            write({ type: 'error', status, message: 'AI response could not be generated. Please retry.' });
        } finally {
            clearInterval(heartbeat);
            res.end();
        }
        return;
    }
    await respond(res, () => service.sendConversationMessage((req as AuthRequest).userId, id.data, input.data.requestId, input.data.text, undefined, images, input.data.directImages,input.data.directVideo));
}

export async function image(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id), requestId = idSchema.safeParse(req.params.requestId);
    const index = Number(req.params.index);
    if (!id.success || !requestId.success || !Number.isInteger(index) || index < 0 || index > 2 || typeof req.query.token !== 'string') {
        res.status(404).end(); return;
    }
    const result = await readChatImage(id.data, requestId.data, index, req.query.token);
    if (!result) { res.status(404).end(); return; }
    res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
    res.redirect(302, result.fileUri);
}
export async function prepareImages(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    const input = z.object({ requestId: idSchema, images: z.array(z.object({
        hash: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().min(12).max(4 * 1024 * 1024),
        mimeType: z.enum(['image/jpeg','image/png','image/webp']),
    }).strict()).min(1).max(3) }).strict().safeParse(req.body);
    if (!id.success || !input.success || input.data.images.reduce((sum,image)=>sum+image.size,0)>8*1024*1024) {
        res.status(400).json({ ok:false, error:'Invalid image metadata' }); return;
    }
    try {
        const data = await reserveImages((req as AuthRequest).userId,id.data,input.data.requestId,input.data.images);
        res.set('Cache-Control','no-store').json({ok:true,data});
    } catch { res.status(409).json({ok:false,error:'Could not prepare upload. Reopen the chat and retry.'}); }
}

export async function prepareVideo(req:Request,res:Response){
 const id=idSchema.safeParse(req.params.id),input=z.object({requestId:idSchema,video:z.object({hash:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().min(16).max(CHAT_VIDEO.maxBytes),mimeType:z.enum(CHAT_VIDEO.mimeTypes)}).strict()}).strict().safeParse(req.body);
 if(!id.success||!input.success){res.status(400).json({ok:false,error:'Send one MP4, MOV or WebM video, up to 3 minutes and 80 MB'});return;}
 try{res.set('Cache-Control','no-store').json({ok:true,data:await reserveVideo((req as AuthRequest).userId,id.data,input.data.requestId,input.data.video)});}
 catch{res.status(409).json({ok:false,error:'Could not prepare video upload. Reopen chat and retry.'});}
}
