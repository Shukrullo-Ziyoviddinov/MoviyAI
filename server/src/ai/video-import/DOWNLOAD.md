# Download and validation (step 4)

`videoDownloader.withVideo(url, async (video, signal) => { ... }, options)` owns
the temporary artifact for the duration of the consumer. A future R2 uploader
must finish reading it before returning. Success, failure and cancellation remove
the job directory. Do not persist `filePath`; persist the later R2 key instead.

`inspectSource` checks metadata without downloading media. Missing platform
duration is allowed here, but the actual downloaded file must pass ffprobe.

- Shared chat limits: 180 seconds, 80 MiB actual media size.
- Source quality: prefer MP4 at up to 720p; if unavailable, bounded fallback.
- Real file: regular non-symlink, recognized container, video stream, dimensions,
  duration and size; decode a real frame before handing it to the consumer.
- Compatible H.264/AAC MP4 is retained; only necessary remux/audio/video
  conversion runs. Oversized dimensions are reduced, never enlarged.
- Private workspace and HTTPS proxy transfer budget: 160 MiB each; download and
  preparation budget 180 seconds, total consumer budget 240 seconds.
- Subprocess arguments are arrays, no shell/config/plugins/cookies. Secrets from
  the app environment are not forwarded. Never log proxy URLs or raw tool output.
- Network: exact platform URL validation followed by DNS-checked, pinned-public-IP
  HTTPS tunnels for downloader requests. TLS verification stays enabled.

Actual progress callbacks: url_check, downloading, probing. Consumer must respect
its AbortSignal. This module does not start a worker, upload R2, invoke Gemini or
send media to chat. Crash/orphan recovery is described in LIFECYCLE.md.
Render deployment is separately verified.
