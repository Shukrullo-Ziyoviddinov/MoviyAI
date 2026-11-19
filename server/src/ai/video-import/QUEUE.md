# Durable video import queue — step 3

Files stay within `ai/video-import/`: models, repository, input/result validators,
service and processor-driven worker. No Redis, npm package, public route or chat
hook is added. Neither the application bootstrap nor the downloader trial starts
this queue. Actual downloading/storage processors are later steps.

## Collections

- `ai_video_import_jobs`: owner kind (`user`/`telegram`) and server-provided ID,
  conversation/request IDs, first original URL, canonical URL, platform/video ID,
  source fingerprint, status/stage, nullable metadata, R2 key, attempts, sanitized
  error code, retry date and worker lease. Metadata contains no video bytes,
  cookies, provider payloads or signed media URLs.
- `ai_video_import_slots`: one shared expiring slot, limiting active claims across
  worker processes. Increase the shared config only after checking server capacity.

An owner/conversation/request tuple deterministically hashes to one job ID and has
a unique database index. Repeating it returns the same job; changing the video
under that tuple raises `REQUEST_CONFLICT`. URL aliases/tracking differences for
the same validated source ID do not overwrite the first original URL. Owners and
Telegram/user identity namespaces remain separate even when their IDs match.

## Lifecycle

`queued -> processing -> completed`, or `processing -> retry -> processing`.
Permanent failures and exhausted retries become `failed`. Owner cancellation is
`cancelled`. Cancelled/completed jobs are not automatically revived by enqueue.
An explicit user retry policy will be wired with the chat integration later.

The queue uses 60-second leases, 15-second renewal, a 240-second processing budget
and at most three automatic attempts. Transient network/time failures retry after
10/30 seconds. Platform/login blocks and invalid metadata are not blindly retried.
Server crashes leave durable tasks; an expired claim can resume from its saved
checkpoint. Fenced writes require a matching token and an unexpired processing
lease, so stale workers cannot overwrite the current result.

Processors must respect AbortSignal and checkpoint completed steps. Cancellation
does not immediately free a running slot: its worker must stop or the lease must
expire. This avoids intentionally overlapping a cancelled download with a new one.
As with any lease system, an unreachable/uncooperative old process may briefly
outlive its lease; downstream processes must honor cancellation and deterministic
object keys. Exactly-once external network effects are not promised.

## Storage contract

Intermediate metadata may be partial/unknown. A completed import requires a
validated resolved source, duration <=180 seconds, size <=80 MiB, MP4 type, valid
dimensions and audio-presence metadata. Reserve the private object namespace:
`videoimport/<job-id>/<sha256>.mp4`. A processor cannot attach another job's key.
The actual R2 writer/access/cleanup helpers are implemented in step 5.

No TTL removes jobs with R2 references. Failed/cancelled jobs retain metadata and
are marked `cleanupPending`; later storage cleanup must safely delete their owned
objects before removing records. This module does not itself delete R2 files.

The service expects trusted server-derived ownership. Future web/native routes
must obtain it from authentication; the bot must obtain it from verified Telegram
updates. Caller-supplied JSON ownership must never be trusted. API authorization,
rate limits, URL-downloader egress isolation and chat visibility are later steps.

Tests exercise the real repository's Mongo filter/update logic with isolated
in-memory model doubles, worker concurrency/recovery and Mongoose schema validation.
They never connect to or mutate a live MongoDB database, or upload to R2.
