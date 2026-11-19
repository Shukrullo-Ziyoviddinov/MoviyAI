type Phase = 'source_metadata' | 'source_download' | 'probe_source' | 'prepare_format' | 'probe_prepared' | 'decode_sample' | 'hash_media';
/** Bounded technical metadata only: never filenames, URLs or provider stderr. */
export async function videoImportPhase<T>(phase: Phase, work: () => Promise<T>) {
  const started = Date.now();
  console.info('[VIDEO_IMPORT]', { event: 'phase-started', phase });
  try {
    const result = await work();
    console.info('[VIDEO_IMPORT]', { event: 'phase-completed', phase, elapsedMs: Date.now() - started });
    return result;
  } catch (error) {
    const item = error as { code?: unknown; failureCode?: string; name?: string };
    const code = item?.failureCode === 'stopped' ? 'STOPPED' : item?.name === 'TimeoutError' ? 'TIMEOUT' : item?.code;
    console.warn('[VIDEO_IMPORT]', { event: 'phase-failed', phase, elapsedMs: Date.now() - started,
      code: typeof code === 'string' && /^[A-Z_]{1,64}$/.test(code) ? code : 'UNKNOWN' });
    throw error;
  }
}
