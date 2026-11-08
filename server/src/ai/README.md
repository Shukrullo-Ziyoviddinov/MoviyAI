# AI chat API

## Image-based movie search

Web/native upload directly to R2: authenticated `POST /conversations/:id/uploads`
accepts `{requestId,images:[{hash,size,mimeType}]}` (SHA-256 hex, at most 3 images,
4 MB each / 8 MB total). It reserves owned object keys and returns five-minute
PUT URLs plus the exact headers to send. Clients PUT the raw file to R2, then
send JSON `{requestId,text,directImages:true}` to the messages endpoint.
The server checks R2 HEAD metadata and only 12 signature bytes using a range GET;
Gemini receives signed R2 GET URLs through `fileData`, and fetches the image itself.
Restored-message retries reuse saved object keys without uploading again.
Conversation responses contain one-hour signed R2 URLs, so chat image bodies also
bypass Render. Open chats renew expiring links in the background.

Deployment: Cloudflare R2 → bucket → Settings → CORS Policy → JSON.
Merge `config/r2-chat-cors.example.json` with existing rules, preserving other
applications' origins/methods; adjust origins to the actual web deployment.
The browser needs PUT plus Content-Type/Cache-Control allowed. CORS does not make
objects public. Existing object-only R2 keys may not have permission to manage CORS.
The Express `CLIENT_ORIGIN` must separately include the web frontend origin.

`ai_chat_uploads` tracks reservations and expires abandoned uploads through the
cleanup worker after one hour. Records remain until R2 cleanup succeeds (no TTL).
Deleting a chat also deletes its reserved objects immediately; reservations stay
until expiry so late writes with an already-issued URL are cleaned again.

Saved-message POST requests accept `multipart/form-data`: `requestId`, `text`
and up to three files named `images`. Supported formats: JPEG, PNG, WebP;
4 MB per file and 8 MB combined. File signatures are checked before AI calls.
The existing JSON text-chat contract is unchanged. Videos are not enabled here.

Images route to `gemini-3.5-flash-lite` for visual clues, then bounded Serper
web/localized-name searches, Gemini source matching, and a poster search.
An inconclusive match asks for another frame instead of inventing a movie.
One successful lookup can use 2 Gemini calls and up to 3 Serper searches.
Poster failure does not discard a sourced identification.

User image files are stored in the existing R2 bucket under `chatimg/`.
MongoDB chat turns store only the object key, MIME type, size and hash, alongside
the search result. Movie/actor catalog collections are not written.
Images are served through one-hour signed R2 links; reopening a chat renews links.
The compatibility signed API image route redirects to R2 instead of proxying bytes.
The chat prefix is excluded from the public image-folder routes.
The bucket must prevent public access to chat objects if it also has a public domain.
Legacy MongoDB image bytes migrate to R2 when an image is viewed or retried;
the bytes are removed only after a successful upload.
Deleting a conversation removes its R2 images before deleting the turns.
Failed deletions retain a hidden tombstone and object references; a cleanup worker
retries on startup and every minute while the server is running.
Media requests have a longer lock/timeout than text requests.
Saved turns include `images` (private image paths) and optional `movie`
(title, supported localized names/year, source links, and poster URLs).

## Topic scope

`config/ai-policy.ts` supplies shared system instructions to both Gemma text chat
and Gemini media analysis. The assistant covers cinema, series, cinema-related
people/topics, Moviy AI usage and natural social exchanges. Unrelated tasks are
redirected toward movie/series discovery in the user's language. Greetings
include a natural invitation to find or choose a film. Product explanations use
the verified facts in this policy; update them when additional features ship.
No classifier model or additional search call is introduced for this policy.

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
- `PATCH /api/ai/conversations/:id/pin` with `{ "pinned": true }` or `false`:
  persist the owner's pin state. List/detail responses include `pinned`;
  clients show pinned conversations separately, without duplicating list items.
- `DELETE /api/ai/conversations/:id`: delete the owner's saved turns and hide the
  conversation. A metadata-only tombstone (without title or message text) prevents
  delayed create requests from resurrecting it. Repeating deletion is safe;
  active generation returns 409 until finished.
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
