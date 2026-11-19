# Web/native/Telegram routing (step 7)

The shared `findMovieFromVideoUrl` coordinator intercepts Instagram, YouTube and
TikTok URLs before normal chat routing. Exact-host/security validation still
applies; lookalike hosts do not fall back to the language model. Ordinary text
and other source links retain their previous routes. URL + direct media and
multiple distinct video URLs are refused rather than ambiguously combined.

Web and native use the existing authenticated conversation endpoint. Ownership,
conversation and request IDs are server-derived. The import ID is stored in the
private `ChatTurn.videoImportId` field. Neither internal R2 keys nor imported
video objects are added to `videos`/`images` or the conversation response.
Normal movie result fields render with the existing UI components.

The bot uses the same coordinator with verified Telegram ownership and a durable
update-derived request ID. It then follows the existing botPresentation/result
publication flow: short notification + result Web App button. Incoming URL text
and internal media remain private bot history; published UI turns contain only
the result. Existing Telegram file uploads still use their original route.

The download worker starts once after MongoDB connects. Shared database slots
bound active download and recognition operations. Polling only observes owned
jobs and real stage transitions. The coordinator waits up to 9 minutes including
queue/retry time; web/native response transport and URL conversation leases allow
10 minutes. Ordinary server AI budgets remain unchanged. Telegram keeps its
existing heartbeat leases while allowing a URL request up to 10 minutes.

Existing stop signals cancel waiting and mark the owned download job cancelled;
its worker notices cancellation through lease renewal and stops the process.
An explicit replay can resume a cancelled/failed import after its previous lease
has stopped/expired, preserving its R2 key. Recognition checkpoints/results also
survive replay. Immediate local stop, cross-instance pause and conversation-delete
cleanup are described in LIFECYCLE.md.

The import recognition outbox owns catalog dispatch, so a UI/bot result does not
enqueue a second catalog task for the same import. Catalog deduplication remains
in the existing save pipeline.

Render Native setup from step 2 still applies:

    Build: npm ci && npm run video:tools && npm run build
    NODE_VERSION=24.13.0

FFmpeg/ffprobe and the downloader must be available in runtime. The existing
start command remains valid. Production platform/IP restrictions can still
reject downloads; failures are reported rather than bypassed.

Server tests cover coordinator routing/waits/cancellation, private web result
shape and Telegram result buttons. Typechecks cover both clients; native upload
tests protect the existing file route. A real Render-to-platform-to-Gemini chat
test is still required after deployment.
