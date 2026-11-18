# Telegram AI chat

## Configuration

Existing `TELEGRAM_BOT_TOKEN`, `GOOGLE_AI_API_KEY`, `SERPER_API_KEY`, `MONGODB_URI`
and `PUBLIC_URL` remain server-only. Add:

```env
TELEGRAM_WEB_APP_URL=https://www.moviyai.uz/
```

Deploy both server and web client. The server registers the existing webhook with
a derived secret header. Do not manually replace it with an unprotected webhook.
No new npm packages or native builds are needed.

## Behavior

- Private Telegram chats only. `/start` and `/help` explain usage; `/new` clears
  bot context and starts a separate result conversation.
- Ordinary text replies and source URL buttons stay inside Telegram.
- Movie, recommendation, cast and character results use the existing AI services
  and rich UI components. The bot sends a Mini App result button.
- The first result requires the existing Google login inside the Mini App.
  Server-validated Telegram `initData` binds this Telegram account to that Moviy AI
  profile. A different Telegram account or Google profile cannot claim its results.
- Only AI results enter `ai_chat_turns`; Telegram prompts and uploaded media do
  not. Later rich results in the same bot conversation append to its UI history.
- Bot history is separate in `telegram_ai_sessions`. The durable inbox/outbox is
  `telegram_ai_updates`; update IDs deduplicate webhook deliveries. Inbox records
  and unopened result links expire after 30 days. Published UI results remain.
- Film catalog jobs are queued without requiring the user to open the result.
  Standard catalog deduplication and enrichment apply. A separate durable bot
  catalog outbox retries database errors without holding Telegram replies. Later
  watch-link followups also update the saved catalog film.

## Media

During photo/video processing the bot creates one status message and updates it
from the same real analysis/search progress callbacks used by the UI. Rapid
updates are coalesced to reduce Telegram rate limiting. The message ID is saved
for recovery; after final delivery the temporary status is removed. Status API
failures never discard an AI result. On AI failure the status shows the actual
mapped failure reason until the explanatory reply is delivered.

Ordinary AI text messages also show a preparing status and Telegram's native
typing indicator. Typing is refreshed while the answer is being generated and
stops on completion, failure or disposal. Fast `/start`, `/help` and `/new`
commands reply directly without a waiting message.

Photo/video bytes are never uploaded to R2 or stored in MongoDB or on Render's
disk. MongoDB holds Telegram file IDs and metadata. Google receives a short-lived
signed streaming relay URL, not the token-bearing Telegram file URL.

**The media stream does pass through Render.** Its memory use is bounded by
stream backpressure, but it uses network bandwidth. This is necessary in this
implementation to keep the Telegram bot token private. Existing web/native
direct-to-R2 uploads are unchanged.

The standard Telegram Bot API download limit is 20 MB; this integration accepts
up to 20 MiB and 3 minutes, subject to Telegram accepting the download. Send a
smaller video or use the existing app for larger files. Unsupported documents are
rejected with an explanatory reply. Video documents without a duration are
rejected; send them as Telegram videos instead.

## Delivery and recovery

Updates are persisted before webhook acknowledgement. A database-backed per-chat
lease and chronological queue prevent concurrent bot replies from mixing context.
Responses are persisted before sending Telegram notifications; a delivery retry
does not repeat Gemini analysis. Telegram `retry_after` is respected, and each
acknowledged text chunk has a saved delivery cursor. Permanent 400/403 delivery
errors end that update instead of blocking later requests. An ambiguous Telegram send timeout can still
cause a duplicate notification because `sendMessage` has no idempotency key.
AI errors produce an explanatory Telegram reply; the user can resend the request.
Long ordinary replies are split into messages of at most 4,000 characters without
discarding the remaining text; inline buttons appear on the last message.

## Manual acceptance after deployment

1. Send `salom`: receive the reply in Telegram, no new UI user turn.
2. Send a supported photo or short video: receive a result button.
3. Open it, log into the existing account if needed: see rich AI result, no
   incoming Telegram photo/video or prompt. Reopen the same button: no duplicate.
4. Ask about that film's actors: see an actor result button and existing rich cards.
5. Ask for sources: receive source URL buttons directly in Telegram.
6. Use `/new`: later results belong to a new UI conversation.
7. Confirm catalog saving independently of opening the Mini App.

References:
- https://core.telegram.org/bots/api#getfile
- https://core.telegram.org/bots/api#setwebhook
- https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
