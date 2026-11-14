import type { ChatFailureCode } from '../types/chat-progress';

/** Keep transport errors separate from AI analysis failures. Never log signed URLs. */
export function uploadFailure(error: unknown, phase: 'reservation' | 'transfer'): Error & { failureCode: ChatFailureCode } {
  const outer = error as { cause?: unknown; failureCode?: ChatFailureCode };
  if (outer?.failureCode) return error as Error & { failureCode: ChatFailureCode };
  const source = (outer?.cause ?? error) as { name?: string; code?: string; response?: { status?: number } };
  const status = source?.response?.status;
  const failureCode: ChatFailureCode = source?.name === 'TimeoutError' || source?.name === 'AbortError' ||
    source?.code === 'ECONNABORTED' || source?.code === 'ETIMEDOUT'
    ? 'upload_timeout'
    : status === 429 ? 'rate_limited'
    : phase === 'reservation' ? status === 409 ? 'upload_conflict' : 'upload_setup_failed'
    : 'upload_connection_failed';
  return Object.assign(new Error(failureCode), { failureCode });
}
