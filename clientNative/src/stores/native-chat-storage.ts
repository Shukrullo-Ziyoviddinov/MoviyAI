/** Only remember selection during this app visit, never across app launches. */
export function createNativeChatStorage(uuid: () => string) {
  const selected = new Map<string, string>();
  return {
    read: async (key: string) => selected.get(key) ?? '',
    write: async (key: string, value: string) => { selected.set(key, value); },
    uuid,
  };
}
