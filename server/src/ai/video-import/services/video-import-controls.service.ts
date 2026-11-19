const active = new Map<string, Set<AbortController>>();
export function registerVideoImport(id: string, controller: AbortController) {
  const controllers = active.get(id) ?? new Set<AbortController>();
  controllers.add(controller); active.set(id, controllers);
  return () => { controllers.delete(controller); if (!controllers.size) active.delete(id); };
}
/** Called only after owner-scoped cancellation/deletion is persisted. */
export function abortVideoImport(id: string, reason: Error) {
  for (const controller of active.get(id) ?? []) controller.abort(reason);
}
