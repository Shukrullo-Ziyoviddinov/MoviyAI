# Native YouTube input

YouTube URLs use Gemini's official YouTube input instead of yt-dlp and R2.
Instagram/TikTok and direct file uploads retain their existing storage paths.

Exact-host URL validation normalizes watch, Shorts and youtu.be links to one
canonical watch URL. A normal owner/request-scoped import job is still created.
Its worker stores `transport: youtube`, `r2Key: null`, and `analysisSeconds: 180`.
Media metadata stays null: an analysis bound is not the source's real duration.
For long YouTube videos only the first three minutes are submitted for analysis;
uploaded media and downloader duration/size limits remain unchanged.

The existing recognition lease, checkpoints, stop/resume, public result and
catalog outbox are reused. Gemini receives the canonical URL with startOffset 0s
and endOffset 180s. No YouTube bytes, temporary files, PUTs or signed R2 URLs are
created. Existing completed R2 YouTube imports continue using their verified
objects; earlier failed URL-only jobs can use the new transport on explicit retry.

Conversation deletion tombstones the normal import and recognition records.
There is no YouTube object to delete. Legacy reserved R2 keys remain tracked by
the existing cleanup service. Private/deleted/restricted videos may be refused
by Gemini; no cookies or authentication challenges are bypassed.

Reference: https://ai.google.dev/gemini-api/docs/video-understanding#youtube
