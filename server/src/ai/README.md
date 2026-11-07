# AI chat API

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
History is supplied by the caller in this phase; it is not yet stored in MongoDB.

Text-only requests use `gemma-4-26b-a4b-it`. The server serializes history and
the current message into a single user text part, labeled with User/AI roles.
The client request and response formats stay the same.
Any media routes the request to Gemini, keeping native multi-message history.
There is no automatic model fallback, Serper invocation, or catalog write yet.

Success: `{ "ok": true, "data": { "role": "model", "text": "...", "model": "...", "usage": {} } }`.
Errors use `{ "ok": false, "error": "..." }` with 400 (input), 401 (auth),
413 (size), 415 (format), 429 (rate limit), or 502 (AI provider failure).
