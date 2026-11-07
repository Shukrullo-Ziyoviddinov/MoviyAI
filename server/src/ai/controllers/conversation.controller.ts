import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/requireAuth.js';
import * as service from '../services/conversation.service.js';
import { AiServiceError } from '../services/google-ai.service.js';
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
export async function send(req: Request, res: Response) {
    const id = idSchema.safeParse(req.params.id);
    const input = z.object({ requestId: idSchema, text: z.string().trim().min(1).max(20000) }).strict().safeParse(req.body);
    if (!id.success || !input.success) {
        res.status(400).json({ ok: false, error: 'Invalid chat input' });
        return;
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
                input.data.requestId, input.data.text, text => write({ type: 'delta', text }));
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
    await respond(res, () => service.sendConversationMessage((req as AuthRequest).userId, id.data, input.data.requestId, input.data.text));
}
