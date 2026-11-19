# Progress, stop/resume and cleanup (step 8)

URL import emits real transitions: checking_link, waiting_import (queued/retry),
downloading_video, preparing_analysis (probe/format preparation), upload_video,
then the existing recognition/search stages. Labels and SSE allowlists are
shared by web/native in Uzbek/Russian/English; Telegram uses the same callbacks.

Stopping preserves the private import ID on the existing turn. Ownership is
checked before download cancellation or recognition pause. Local controllers
abort immediately; another instance notices download cancellation on heartbeat
or recognition pause within its one-second lease check. A late completion is
fenced out. Continue reuses the original request ID and prompt/checkpoints.
Ready R2 media survives stop/provider failure and is verified with HEAD on replay.
No imported media enters visible chat attachment arrays.

Every reserved object key is tracked (including prior hashes after retries).
References are not cleared on timeout or an ambiguous PUT outcome. Live UI
conversation imports remain available for retry; user stop is not deletion.

Deleting a conversation tombstones imports and recognition records first.
New download/analysis leases and resumes then fail. Local workers are aborted;
R2 deletion waits past any persisted upload/analysis lease plus a 60-second
grace period. Conversation deletion can return while cleanup is pending; the
background cleanup retries every minute, with per-job exponential backoff after
errors. Every key must belong to the exact job's private namespace. Keys are
cleared only after all R2 deletions succeed. Public catalog outboxes survive long
enough to copy their data, then result/checkpoint bodies can be removed. Small
tombstones remain to block stale callers from recreating deleted work.

The periodic scanner processes bounded batches. Telegram internal media is
eligible when its published UI conversation is deleted or the original bot
update expires. An import with no owning conversation/bot update is treated as
orphaned only after 24 hours. Active owners are checked again hourly.

Local workspaces have a PID marker and heartbeat. Normal completion/failure/
abort removes the workspace after processes and file handles finish. Crash
recovery only removes stale (>1 hour), dead-process directories directly inside
the fixed private root. Live/recent directories and symlinks are excluded, and
absolute/real paths are checked before recursive removal.

Tests cover stop signals, cross-instance recognition pause, reserved-key history,
deletion tombstones, lease barriers, R2 retry/backoff, namespace isolation, temp
orphan recovery, translation/SSE delivery and existing chat resume ordering.
Live R2 tests use generated media and do not delete user objects or mutate live
Mongo records. Render end-to-end verification remains separate.
