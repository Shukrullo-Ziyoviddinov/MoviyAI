# Video URL import verification — 2026-11-19

Do not equate unit tests, metadata-only extraction, local downloads and Render
end-to-end success. The following records identify the actual evidence.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Server build | Passed locally | TypeScript compilation |
| Server regression suite | 401 passed on Node 24.13.0 | Repeated after compatible dependency security updates; URL/SSRF guards, limits, ownership, queue slots, checkpoint/retry, cancellation, cleanup/outbox tests |
| Web production build | Passed locally | Next.js patched from 16.4.0 to 16.4.6 |
| Web regression suite | 88 passed | Includes shared native/web stream and session behavior |
| Native typecheck + suite | Passed; 35 tests | No emulator/APK build was run |
| Native lint | Not run successfully | Existing ESLint configuration is missing |
| Production dependency audit | 0 advisories in client and server | `npm audit --omit=dev`; not a claim about dev dependencies. Server retains two moderate development-only nodemon/minimatch advisories requiring an incompatible change |
| Instagram download | Passed locally, prior step | User-provided fixture, 67.221769 s, 720 x 720, audio; not a Render trial |
| YouTube short download | Passed locally | 11.447438 s, 836,032 bytes, 360 x 640, audio; actual file + ffprobe/frame validation |
| YouTube duration limit | Passed live | Longer supplied fixture returned VIDEO_TOO_LONG before media download |
| TikTok supplied fixture | Failed locally | NETWORK_ERROR; sanitized diagnostics indicate timeout. No private/login bypass attempted |
| Private / deleted real fixtures | Not tested | Error classification is unit-tested; no known private/deleted fixture supplied |
| R2 upload / signed GET / deletion | Passed live, prior steps | Generated disposable media only; no user objects deleted |
| Local temporary cleanup | Passed | Success/failure/stop tests and dead-PID orphan recovery |
| Parallel workers / restart recovery | Passed with model doubles | Shared lease fencing and persisted checkpoint semantics; not a real Render restart |
| Real MongoDB process restart trial | Blocked | Connection returned ECONNREFUSED before creating isolated QA collections |
| Render platform / full Gemini chat / bot result | Not verified | Requires deployed service and authenticated dashboard/runtime access |
| Deployment | Verify independently of Git push | A published commit does not itself prove Render/Vercel deployment succeeded. Browser control previously stopped because current Windows URL could not be established safely; backend /health exposes the Render commit prefix when available |

## Repeatable commands

Server:

    npm ci
    npm run build
    npm run video:probe -- --check
    npm run video:probe -- --url HTTPS_VIDEO_URL
    npm run video:queue-probe

`prebuild` installs/verifies the pinned official yt-dlp binary. Server engines
select Node 24.x where the host honors package.json. On Render, an existing
NODE_VERSION environment variable has higher precedence and must be compatible.
FFmpeg and ffprobe must be present. Existing start command remains npm start.

The queue probe creates random `qa_video_import_jobs_<nonce>` and
`qa_video_import_slots_<nonce>` collections only, tests separate Node processes,
simulates lease expiry rather than waiting for a crash timeout, then drops those
exact collections. It never touches production collection names or R2 objects.
A database connection failure must remain a blocked result, not a passed test.

After deployment, verify a short URL in authenticated web/native and Telegram:
status transitions → movie result / result button → stop + continue reuses the
import → delete conversation → asynchronous R2 cleanup completes. Also verify a
Render restart, datacenter platform access and known private/deleted fixtures.
Until those checks are performed, three-platform production readiness is not
claimed. TikTok timeout remains an explicit unresolved external-access result.

Render Node version precedence: https://render.com/docs/node-version

## Follow-up: production import timeout

Render Telegram logs showed repeated PROCESS_TIMEOUT in VIDEO_IMPORT before
recognition. The old logs did not identify the exact subprocess; its cause must
not be asserted as a verified Gemini failure. Local profiling of the supplied
short found unnecessary video conversion. The new format policy selected ready
H.264/AAC media and produced converted=false (856,679 bytes, 11.434667 seconds).
Local total time was about 20 seconds, not a proven Render performance result.

Conversion is now bounded to 60 seconds and a preparation timeout is not
automatically retried; users receive a preparation-specific error. Existing
compatible Full HD videos avoid resizing. Phase diagnostics identify the exact
timed-out operation without recording raw provider output or media URLs.
Backend tests after this change: 404 passed; web 88; native 35. Render must be
retested with the new commit before declaring this production timeout resolved.
