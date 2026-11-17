Read-only video identification experiment
=======================================

Run from `server/` after the normal server build:

    node scripts/video-identification-trial.mjs a
    node scripts/video-identification-trial.mjs b
    node scripts/video-identification-trial.mjs latest
    node scripts/video-identification-trial.mjs a --frames
    node scripts/video-identification-trial.mjs b --frames
    node scripts/video-identification-trial.mjs a --local
    node scripts/video-identification-trial.mjs b --local
    node scripts/video-identification-trial.mjs b --local --files
    node scripts/video-identification-trial.mjs a --frames --reuse-observations
    node scripts/video-identification-trial.mjs b --frames --reuse-observations
    node --test tests/video-trial-evidence.test.mjs

The script uses existing `.env` credentials and existing uploaded test samples.
It only reads MongoDB. If a deleted chat has already been cleaned up, it uses the
existing local QA video copy, without restoring the chat or uploading to R2.
Google and Serper requests consume their normal API quotas.
`--local` skips MongoDB and sends the existing video copy with its audio.
`--files` additionally uploads that same copy to Google Files, waits until it is
ready, and deletes the temporary Google file in `finally`. Its report has a
`-files` suffix. This transport comparison does not change R2 or Render code.
`--reuse-observations` uses the saved full-video observations for the same sample
and duration, avoiding another video-analysis request. It writes a separate
`-recovery` report. With `--frames`, final visual verification uses the three
frames plus saved observations; it does not independently retranscribe audio.
`--frames` uses the existing three extracted frames with explicit timestamps;
there is no audio in this mode, so the model must leave dialogue null. It does
not measure full-video or audio recognition performance. Reports have a separate
`-frames` suffix. A provider failure or exhausted Serper credits is a failed
experiment, not a no-match identification result.

Stages: title-free timed observations, at most two evidence-only searches, then
verification against the clip. Expected titles and previous wrong guesses never
enter the model prompts. A match must point to an observed moment and an exact
search-snippet quotation with an explained distinctive connection. Generic
actor/clothing similarity or an unsupported quotation is rejected.

This does not prove that a quotation is factually correct or that the model's
scene interpretation is correct. Reports need human review. Search snippets can
be too short to confirm a valid film; an abstention is not a successful recovery.
This is an evaluation tool, not a production accuracy guarantee.

Each stage has a 75-second call limit and up to two transient-error retries
(2 and 5 seconds), sharing a 240-second trial deadline. Reports in
`.qa-lens/evidence-trial-*.json` contain observed film content and public search
results, never API keys, R2 object keys, signed URLs or user identifiers.

No chat routes, production model configuration, movie/actor records, catalog
jobs, or R2 objects are modified. Integrate only after reviewing real outcomes.

Observed trial outcome (2026-11-17)
---------------------------------

Both known samples abstained with frame-only analysis. Full-video sample A
returned timed actions and Uzbek dialogue after transient 503 retries, but its
searches did not retrieve the correct film. Full-video sample B timed out inline;
Google Files transport completed analysis after one 503, returning useful actions
and dialogue, but its searches also failed. The temporary Google file was deleted.
Reusing full-video observations with action-oriented search planning and frame
verification still produced no accepted identification in either sample.

These are two abstentions, not two correct identifications. No production accuracy
improvement has been established. Returned dialogue has not been independently
transcribed by a human, so its exact wording is not ground truth. Expected titles
were never used in prompts or query construction.
