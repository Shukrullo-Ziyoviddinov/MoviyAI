# Video import (steps 1–3)

This module is separate from chat media uploads and movie recognition. The
step-3 queue writes only its own job/slot collections when explicitly invoked;
it is not started by the application. No R2 uploads, Gemini requests or
user-facing routes are wired. The step-2
operator-only downloader trial is documented in `server/scripts/VIDEO_DOWNLOADER_TRIAL.md`.
The step-3 MongoDB queue contract and integration boundaries are described in `QUEUE.md`.

- `services/video-url.service.ts`: extract a single distinct supported video URL
  from text, validate exact platform hosts and video paths, and normalize tracking
  parameters away. Ordinary text without an HTTP(S) URL returns `null`.
- `services/video-url-resolution.service.ts`: resolve supported TikTok short URLs
  using bounded manual HEAD redirects; validate DNS on every hop. Verified IPs are
  pinned to HTTPS connections while normal hostname/certificate validation stays on.
- `validators/public-address.validator.ts`: reject internal/special-use addresses,
  including mixed public/private DNS answers. The policy intentionally fails closed.
- `config/` and `types/`: shared limits, return types and sanitized error codes.

Only HTTPS is accepted. Instagram reel/post/tv shortcodes, YouTube watch/Shorts/
youtu.be video IDs and TikTok video IDs are parsed. TikTok short codes are **not**
treated as video IDs: `needsResolution` stays true until a supported video URL is
obtained. Duplicate references to the same canonical URL count as one candidate.
Unsupported links produce explicit errors; chat routing will decide whether such
links are ordinary conversation or unsupported video imports when integrated.

The validator proves URL shape and safe network destinations, **not** video
availability, permission to download, or actual video contents. Those checks belong
to later downloader/metadata steps. Login pages, JS-only short-link responses and
platform blocks are not bypassed.

Security boundary: this policy protects these page URL/DNS/HEAD operations only.
It does not automatically sandbox future yt-dlp/FFmpeg requests or CDN URLs.
The downloader must enforce its own network/redirect policy before integration.

No chat integrations are enabled in these steps. Existing text/photo/video chat
behavior is unchanged. URL unit tests use isolated DNS/HTTP dependencies and
never fetch real platform videos. Live downloader trials are run explicitly and
reported separately.
