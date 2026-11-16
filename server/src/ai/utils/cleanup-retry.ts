export function cleanupRetryDelay(attempt: number): number {
  return Math.min(3600000, 60000 * 2 ** Math.min(6, Math.max(0, attempt - 1)));
}

/** Never log SDK error messages, object keys, signed URLs or credentials. */
export function cleanupErrorInfo(error: unknown) {
  const item = error as {name?: unknown; code?: unknown; $metadata?: {httpStatusCode?: unknown}} | null;
  const safe = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_]{1,64}$/.test(value) ? value : null;
  const status = item?.$metadata?.httpStatusCode;
  return {errorKind: safe(item?.name) ?? 'UnknownError', code: safe(item?.code), status: typeof status === 'number' ? status : null};
}
