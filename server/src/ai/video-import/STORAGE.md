# R2 integration (step 5)

YouTube now uses native Gemini URL input; see [YOUTUBE.md](YOUTUBE.md). The R2
flow below applies to Instagram/TikTok and existing stored YouTube imports.

`createVideoImportPipeline()` composes the durable Mongo queue worker with the
download → validation → R2 processor. Startup is explicit; there is no new public
route or automatic worker start before the chat integration is ready.

The processor reserves `videoimport/<job-id>/<sha256>.mp4` and complete validated
metadata through the lease-fenced Mongo checkpoint **before** starting the PUT.
Only metadata and the key are stored in MongoDB, never media bytes or expiring
signed URLs. A retry checks the existing object via HEAD and reuses a verified
upload, avoiding another platform download. A missing object is downloaded again.

The storage adapter uses the existing lazy R2 client, bucket and credentials.
PUT reads the temporary file with a 256 KiB ReadStream, explicit content length
and a precomputed SHA-256 checksum. It does not assemble the video in a Buffer.
Objects are private/no-store and excluded from the public image namespaces.
HEAD verifies content type, size and SHA-256 metadata before completion.

The downloader owns local files until the upload/verification callback finishes.
Success, error or abort closes the file stream/handle and removes the workspace.
The queue keeps its shared parallel limit of 1, 3 bounded attempts, lease renewal
and total 240-second budget. PUT additionally has a 60-second limit, HEAD 10 seconds.

Remote upload outcomes can be ambiguous after a network failure. Their reserved
keys therefore remain in Mongo for retry or later cleanup; failed/cancelled jobs
are marked cleanupPending. Do not delete their records or blindly delete an
object while another valid lease could still use it. Automatic retention and
conversation-deletion cleanup are described in LIFECYCLE.md.

Verification: mocked S3 transport tests inspect actual streams and command
parameters; processor tests cover checkpoint-before-PUT and reuse. A real local
R2 probe uploaded, inspected and deleted a generated 1,817-byte MP4 successfully.
No user object or live Mongo record was modified by that probe. Render remains
a separate environment check. No Gemini/chat/player integration is included here.
