# AI chat API

## Saved conversations (web and native)

Send `Accept: text/event-stream` on the saved-message POST endpoint to receive
SSE `data:` JSON packets: `{type:"delta", text}`, then `{type:"done", data:conversation}`
after the answer is persisted, or `{type:"error", status, message}` on failure.
The stream is not compressed/buffered and sends keepalive comments while waiting.
Without that Accept header the existing JSON response is retained.
Gemma generation uses its real streaming API for SSE requests; user/model storage
and retry IDs are unchanged. A disconnected client can reopen the saved conversation.

All endpoints below require the existing Bearer session and scope every query to
its owner. MongoDB creates `ai_conversations` (titles/ownership) and
`ai_chat_turns` (user message, answer, model, status) on first use.

- `GET /api/ai/conversations`: sidebar summaries, newest activity first.
- `POST /api/ai/conversations` with `{ "id": "UUID" }`: idempotently create a chat.
- `GET /api/ai/conversations/:id`: restore saved turns, including failed messages.
- `POST /api/ai/conversations/:id/messages` with `{ "requestId": "UUID", "text": "..." }`:
  persist the user message, generate a reply, and persist the answer. Returns
  the saved conversation. Repeat the same request ID/text to retry safely.

Failed AI requests retain the user message. Completed requests replay their
saved result. Per-conversation locks prevent simultaneous generation; stale
processing turns become retryable after 90 seconds. The latest 15 completed
turns provide model context; the full saved conversation remains available to view.
Clients store only the selected conversation ID, separately for each user;
messages are restored from the server. New chat stays blank until the first message.
Messages previously held only in browser/app memory cannot be recovered after refresh.

Tests: run `npm run build` then `node tests/conversation.test.mjs` in `server`,
and `node tests/chat-session.test.cjs` in `client`. These use isolated repositories
and API doubles; they never modify production MongoDB.

## Legacy stateless chat endpoint

`POST /api/ai/chat` requires the existing Bearer access token.

Text requests use `application/json`:

```json
{"text":"Salom", "history":[{"role":"user","text":"Oldingi xabar"},{"role":"model","text":"Oldingi javob"}]}
```

Image/video requests use `multipart/form-data`: `text` (optional), `history`
(optional JSON array), and up to 3 files under the repeated `media` field.
Each file and the combined files must not exceed 15 MB. Supported MIME types:
JPEG, PNG, WebP, MP4, MPEG, QuickTime, WebM. Current checks validate declared
MIME types; content verification should be added before public media rollout.

Text is limited to 20,000 characters; history to 30 messages of 20,000 characters.
The endpoint accepts 10 requests per authenticated user per minute per server process.
For this legacy endpoint only, history is supplied by the caller and not stored.

Text-only requests use `gemma-4-26b-a4b-it`. The server serializes history and
the current message into a single user text part, labeled with User/AI roles.
The client request and response formats stay the same.
Any media routes the request to Gemini, keeping native multi-message history.
There is no automatic model fallback, Serper invocation, or catalog write yet.

Success: `{ "ok": true, "data": { "role": "model", "text": "...", "model": "...", "usage": {} } }`.
Errors use `{ "ok": false, "error": "..." }` with 400 (input), 401 (auth),
413 (size), 415 (format), 429 (rate limit), or 502 (AI provider failure).
