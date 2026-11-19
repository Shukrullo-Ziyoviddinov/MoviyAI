# Isolated video downloader trial — step 2

This is an operator CLI, not a chat feature. It never connects to MongoDB, R2,
Gemini or Telegram. It does not return a video to the user. The production chat,
queue and cleanup wiring are documented under src/ai/video-import/.

## Tools

Run from `server/`:

```powershell
npm run video:tools
npm run build
$env:VIDEO_JS_RUNTIME_PATH = 'C:\Users\shukr\AppData\Local\nvm\v24.13.0\node.exe'
npm run video:probe -- --check
```

The setup script installs only the official standalone yt-dlp executable in
`server/.tools/video-import/`. Its version, byte count and SHA-256 are pinned in
`scripts/video-tools.lock.json`; mismatched files fail verification. Windows x64
and Linux x64 are supported by this installer. No global runtime/PATH switch,
Python, Docker Desktop, emulator or replacement FFmpeg is installed locally.

Local inspection found:
- yt-dlp 2026.10.26: installed and SHA-256 verified, 23,575,744 bytes on Windows.
- FFmpeg/ffprobe: existing installation reused.
- Backend Node 20.20.2: unchanged.
- External challenge runtime: existing Node 24.13.0, selected by the variable above.

Overrides, when needed: `VIDEO_YTDLP_PATH`, `VIDEO_FFMPEG_PATH`,
`VIDEO_FFPROBE_PATH`, `VIDEO_JS_RUNTIME_PATH`. Existing application environment
names are unchanged. For Linux Node 24, the JS runtime defaults to the current
Node executable; no override is needed.

## Permissioned live trial

```powershell
npm run video:probe -- --url 'https://www.instagram.com/reel/Dfb97sYMc6q/'
```

For extraction/metadata only, add `--metadata-only`. This does **not** prove a
download succeeded. Absent Instagram duration is represented as `null`; a bounded
download plus ffprobe is required to verify it. Known duration above 180 seconds,
private/login-required content and live streams are rejected before downloading.

The selected profile is at most 720px high, preferring MP4. Separate audio/video
tracks are merged; compatible streams are remuxed rather than transcoded. The
final video must be <=80 MiB and <=180 seconds. Unknown duration does not disable
the output-byte, temporary-disk or process-time limits. Temporary files are kept
only under `.video-import-tmp/job-*` and are removed on success/failure/stop.
The latest sanitized report is `.qa-video-import/latest-report.json`.

Real local result for the user-provided Instagram fixture:
- Downloaded and inspected with ffprobe: 5,065,201 bytes, 67.221769 seconds.
- 720 × 720, audio present.
- No cookies, browser sessions, login or bypass service used.
- Files were cleaned afterwards. An earlier trial exposed a file-rename race in
  the temporary-size monitor; vanished `.part` entries are now tolerated.

YouTube Shorts was downloaded and verified on 2026-11-19 (11.447438 seconds,
836,032 bytes, 360 x 640, audio). A longer YouTube fixture was rejected by the
180-second limit. The supplied TikTok fixture failed with NETWORK_ERROR;
sanitized diagnostics confirmed a timeout, not a proven login/private rejection.
See VIDEO_IMPORT_QA.md for the full test/deployment status.

## Render Native environment

The user confirmed Node.js Native. Keep that runtime; Docker is not needed.
Render documents FFmpeg as included in native builds and runtime. The probe
checks FFmpeg **and** ffprobe explicitly instead of assuming their versions.
The installer puts the checksum-verified Linux x64 yt-dlp under the project.

For a service with Root Directory `server`, use this temporary test build command:

```sh
npm ci && npm run video:render-probe
```

If Root Directory is the repo root, prefix it with `cd server &&`.
Keep the existing Start Command (`npm start` when Root Directory is `server`).
Set this non-secret environment variable for the permissioned live test:

```env
VIDEO_IMPORT_PROBE_URL=https://www.instagram.com/reel/Dfb97sYMc6q/
```

Node 22+ is required for the external JS runtime. If the service uses an older
Node, Render supports selecting it with `NODE_VERSION`; 24.13.0 is already
available and verified locally. Do not paste the Windows-only local
`VIDEO_JS_RUNTIME_PATH` into Render; the default Linux Node executable is used.

The build log contains tool versions and the actual result. A missing tool or
platform block intentionally fails the test build, with a sanitized failure code
and tool name. No database/R2/Gemini/Telegram calls occur during this probe. The
normal application starts only after a successful build.

After the live test, remove `VIDEO_IMPORT_PROBE_URL`. The same build command then
only installs/verifies tools and performs the version check, without repeatedly
downloading the fixture on future deploys. Existing environment names and secrets
are not changed by the scripts.

No Render deployment control was available in this step; the actual Render trial
has not been run. Local success does not prove a datacenter IP will be accepted.

## Security boundary and remaining work

The process runner uses `spawn` with `shell:false`, bounded output and timeouts,
a filtered environment, and process-tree termination. yt-dlp ignores user config,
external plugins, caches and remote script components. Only the requested
platform extractor is enabled. URL validation uses the step-1 policy.

The probe now uses the shared step-4 downloader. Its job-private authenticated
CONNECT proxy accepts public HTTPS destinations only, checks every DNS response,
pins the chosen address, and bounds transfer bytes. Plain HTTP and internal IPs
are refused. The processor only reads local files and verifies actual media.
This is not an OS-level sandbox. Before exposing chat input, connect the durable
queue, R2 ownership/cleanup, cancellation and per-user rate limits.
No login/DRM/geo restrictions are bypassed; restrictions are reported as failures.

References:
- https://github.com/yt-dlp/yt-dlp#installation
- https://github.com/yt-dlp/yt-dlp/wiki/EJS
- https://render.com/docs/native-runtimes
- https://render.com/docs/node-version
