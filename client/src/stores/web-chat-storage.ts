/** Restore only a refresh of this tab; a new visit starts with a blank chat. */
export const webChatStorage = {
  read: async (key: string): Promise<string> => {
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== 'reload') return '';
    try { return window.sessionStorage.getItem(key) ?? ''; }
    catch { return ''; }
  },
  write: async (key: string, value: string) => { window.sessionStorage.setItem(key, value); },
  uuid: () => crypto.randomUUID(),
};
