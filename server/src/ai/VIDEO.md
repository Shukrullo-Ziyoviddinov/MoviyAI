# Chat video flow

- One MP4, MOV or WebM clip per turn; up to 180 seconds and 80 MiB. Images and
  video must be sent in separate turns. Containers without a readable duration
  are rejected rather than trusting a client-supplied duration.
- Authenticated `POST /conversations/:id/video-upload` reserves an owner-scoped
  R2 key and returns a short-lived PUT URL. The client uploads directly to R2,
  then sends JSON with `directVideo: true`. Video multipart uploads are rejected.
- The server checks R2 HEAD metadata and bounded container-header ranges (at most
  128 KiB total). MP4/MOV media atoms are skipped; no video file is downloaded to
  disk, forwarded through the API server, or decoded by the API server.
- A chat turn stores only key/hash/MIME/size/duration. Gemini receives a signed
  R2 GET URL with video sampling metadata (1 FPS, bounded by verified duration).
  It examines multiple scenes; the normal database-first movie lookup, sourced
  dossier, links, media and catalogue outbox handle the result.
- Retry uses the saved video reference. Reopening/refreshing returns fresh R2
  URLs. Deletion removes the video before removing chat references; failed R2
  cleanup is retried. Abandoned upload reservations retain late-PUT cleanup until
  their signing window has expired.
- The UI layout/viewer is unchanged; only sending gates, upload transport,
  restored video references, duration validation and limit text were connected.

Checks include container parser tests, reservation ownership/idempotence,
duration limits, retry/restoration, cleanup and signed URL forwarding. A generated
four-second clip was uploaded to R2 directly, inspected through metadata ranges,
and successfully read by Gemini via the signed GET URL. The test object was
deleted afterward. A real film-identification test on deployed web/native remains
part of rollout verification.
