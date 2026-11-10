export type CatalogProvider = 'google' | 'serper' | 'r2' | 'image-source' | 'mongodb' | 'internal';
export type CatalogStage = 'movie-evidence' | 'movie-facts' | 'translation' | 'poster-search' |
  'actor-evidence' | 'actor-facts' | 'actor-image-search' | 'franchise-search' | 'franchise-facts' |
  'trailer-search' | 'watch-search' | 'image-download' | 'image-upload' | 'duplicate-check' |
  'reference-load' | 'enrichment' | 'franchise' | 'links' | 'save' | 'checkpoint';
interface Context { provider: CatalogProvider; stage: CatalogStage; model?: string }
type Kind = 'http' | 'timeout' | 'aborted' | 'invalid-response' | 'unknown';
function httpStatus(error: unknown): number | null {
  const candidate = error as { status?:unknown; $metadata?:{httpStatusCode?:unknown} } | null;
  const status = candidate?.status ?? candidate?.$metadata?.httpStatusCode;
  return typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}
function errorKind(error: unknown): Kind {
  if (httpStatus(error)) return 'http';
  const name = (error as {name?:unknown} | null)?.name;
  if (name === 'TimeoutError') return 'timeout';
  if (name === 'AbortError') return 'aborted';
  if (name === 'SyntaxError' || name === 'ZodError') return 'invalid-response';
  return 'unknown';
}
export class CatalogOperationError extends Error {
  readonly status: number | undefined;
  readonly kind: Kind;
  constructor(readonly context: Context, error: unknown) {
    // Never retain SDK messages, headers, prompts, signed URLs or payloads.
    super(`CATALOG_${context.provider.toUpperCase()}_${context.stage.toUpperCase().replaceAll('-', '_')}`);
    this.status = httpStatus(error) ?? undefined;
    this.kind = errorKind(error);
  }
}
export function catalogFailureDetails(error: unknown) {
  return error instanceof CatalogOperationError
    ? { ...error.context, providerStatus:error.status ?? null, errorKind:error.kind }
    : { provider:'internal' as const, stage:null, providerStatus:httpStatus(error), errorKind:errorKind(error) };
}
export async function catalogOperation<T>(context: Context, work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) { throw error instanceof CatalogOperationError ? error : new CatalogOperationError(context,error); }
}
