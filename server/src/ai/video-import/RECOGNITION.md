# Existing movie recognition bridge (step 6)

After a job reaches storage status `completed`, call
`recognizeImportedVideo(trustedOwner, jobId, {text, signal, onDelta, onProgress})`.
`createVideoImportPipeline()` also exposes this method as `recognize`.
The caller must derive ownership from authentication/verified Telegram updates.
There is no public endpoint or chat attachment/player hookup in this step.

The entry point checks the owner-scoped import, validates its metadata/key,
checks R2 HEAD, and signs a private GET URL valid for 15 minutes. It passes this
URL, MP4 MIME type and verified duration to the existing `findMovieFromVideo`.
That service keeps its current Gemini model, catalog lookup, Internet/Serper
research, brief answer/posters and Uzbek-link lookup. No second recognition
implementation or alternative model is introduced.

Download/upload and recognition have separate budgets: storage can use up to
240 seconds; recognition has its own 180-second deadline. Mongo holds a global
recognition slot (one call at a time) with a 210-second recovery lease. A busy
call returns ANALYSIS_BUSY; the later chat coordinator handles waiting/retry.
Leases fence checkpoint/completion writes. Stop signals propagate through the
existing AsyncLocalStorage operation context to current provider/search helpers.

`ai_video_import_results` stores only the public result and completed operation
checkpoints. Results are keyed by import ID. The same request reuses its saved
answer; changing its original prompt returns ANALYSIS_CONFLICT. Signed R2 links
are regenerated for each analysis attempt and are not persisted. The existing
checkpoint helper omits media URLs from its keys and bounds stored JSON size.

Completion atomically commits both result and catalogDispatch=pending. The
existing catalog worker drains the import outbox alongside its chat outbox,
using the existing eligibility/input/deduplication/enrichment/save pipeline.
Catalog failure cannot erase the answer; pending dispatch survives restart.
Import catalog IDs use a separate deterministic namespace to avoid collisions
with future chat turns. Existing catalog matches are not enqueued again.

Verification includes ownership, missing R2 object, completed result reuse,
provider-failure checkpoint reuse, concurrent-call refusal, abort propagation,
catalog-outbox recovery and schema tests. The temporary GET URL was also checked
against real R2 with a generated video and then deleted. A live movie recognition
request and Render end-to-end verification remain for the chat hookup stage.
