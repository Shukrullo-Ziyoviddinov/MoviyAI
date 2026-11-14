/** Ignore inactive/notification states and the gallery's temporary activity. */
export function createChatVisitHandler(reset: () => void, isPicking: () => boolean) {
  let leftApp = false;
  let previous = 'active';
  return (state: string) => {
    if (state === previous) return;
    previous = state;
    if (state === 'background') {
      leftApp = !isPicking();
      return;
    }
    if (state !== 'active' || !leftApp) return;
    leftApp = false;
    if (!isPicking()) reset();
  };
}
