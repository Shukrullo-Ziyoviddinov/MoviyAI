# AI chat API

## Temporary Render diagnostic

Deploy the updated server code, then set `AI_DIAGNOSTIC=true` in Render's
Environment settings and deploy/restart. Once the HTTP server is listening,
each process sends one small Gemma request with no search tools or retries.
It does not block startup and times out after 30 seconds.
Filter Render Logs for `[AI_DIAGNOSTIC]`: expect `started` followed by
`success`, `empty_response`, or `failed`. Failures include a safe reason and
an HTTP status when available. Missing keys produce `skipped`.
Neither the API key, request text, nor response text is logged.
This probe checks a plain provider request, not the complete chat endpoint.
Set `AI_DIAGNOSTIC=false` or remove the variable after the test, since each
enabled process restart sends another billable/quota-counted request.

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

Text-only requests use Gemma. Any media routes the request to Gemini.
There is no automatic model fallback, Serper invocation, or catalog write yet.

Success: `{ "ok": true, "data": { "role": "model", "text": "...", "model": "...", "usage": {} } }`.
Errors use `{ "ok": false, "error": "..." }` with 400 (input), 401 (auth),
413 (size), 415 (format), 429 (rate limit), or 502 (AI provider failure).
