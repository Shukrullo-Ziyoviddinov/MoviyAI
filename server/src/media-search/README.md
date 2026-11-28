# Search media recognition

The Search camera button has its own request collection and endpoints. It never creates a Conversation/ChatTurn or selects the user's active chat.

1. `POST /api/media-search/uploads`: authenticated UUID + one attachment's kind, MIME, byte size and SHA-256 metadata. Returns a short-lived PUT URL for an owner-bound private R2 key.
2. Client uploads directly to R2. Existing on-device/browser video preparation is reused. Render does not receive the media body.
3. `POST /api/media-search/:id/analyze`: authenticated owner, language; SSE progress, then `done.movie` or `error.code`. R2 range inspection verifies content before a signed GET is passed to the existing brief image/video recognition pipeline.

Limits: one JPEG/PNG/WebP <=4 MB or MP4/MOV/WebM <=80 MB and <=180 seconds. One active media search per account, plus authenticated endpoint rate limiting. Retries reuse the UUID, immutable attachment metadata and completed checkpoints; completed results return without another AI request. Different accounts cannot access the same request UUID.

The result payload contains only title/year, posters and Uzbek watch links. Detailed facts, trailers and cast are not rendered by this modal. The existing UzbekMovieLinks component retains its source player/external-page behavior.

Completed results have an outbox for the existing catalogue queue and popularity event collection. Deterministic IDs and insert-only upserts make dispatch idempotent. A maintenance timer retries dispatch and deletes expired private R2 objects before deleting request metadata. No Mongo TTL is used. Upload reservations last one hour, beyond the five-minute PUT lifetime, so late canceled uploads remain discoverable for cleanup. Processing has a three-minute deadline and a four-minute crash-recovery lease.

Uses existing Google, Serper and R2 environment settings/CORS; no new API key or package is required.
