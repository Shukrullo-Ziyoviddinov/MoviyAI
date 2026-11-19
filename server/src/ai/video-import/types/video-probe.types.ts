export type VideoProbeErrorCode = 'TOOL_MISSING' | 'TOOL_FAILED' | 'JS_RUNTIME_UNSUPPORTED' | 'PROCESS_TIMEOUT'
  | 'PROCESS_OUTPUT_LIMIT' | 'PLATFORM_BLOCKED' | 'VIDEO_UNAVAILABLE' | 'NETWORK_ERROR'
  | 'INVALID_METADATA' | 'VIDEO_TOO_LONG' | 'VIDEO_TOO_LARGE' | 'LIVE_VIDEO' | 'INVALID_ARTIFACT' | 'PREPARATION_TIMEOUT';
export class VideoProbeError extends Error {
  constructor(public readonly code: VideoProbeErrorCode, public readonly tool?: string) { super(`VIDEO_PROBE_${code}`); this.name = 'VideoProbeError'; }
}
export type ProcessOutput = { stdout: string; stderr: string };
export type VideoProbeMetadata = { id: string; duration: number | null; width?: number; height?: number };
