// A tiny event bus so the app can tell Drip what just happened (an undo, an
// export, a deleted study) without threading callbacks through every
// component. Purely cosmetic: nothing depends on anyone listening.
const subs = new Set();

export function buddyEvent(type, detail = {}) {
  for (const fn of subs) {
    try { fn({ type, ...detail }); } catch { /* a guide must never break the app */ }
  }
}

export function onBuddyEvent(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
