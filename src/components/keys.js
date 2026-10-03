// Shared rules for the app's window-level keyboard shortcuts.

// Is the keyboard focus somewhere the user is typing or choosing? Shortcuts
// must leave those keys alone: Ctrl+Z is the field's own undo, a letter is
// select type-ahead, and Option+digit types a character on a Mac.
export const isTypingTarget = (el) => !!el && (
  el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
  || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(el.type))
);

/**
 * Should a window-level shortcut act on this key event?
 *
 * Only when it comes from inside this app instance. As a Power Apps code
 * component the app shares the page with the canvas app's own controls (and
 * possibly a second instance of itself), whose keys are not ours — Ctrl+Z in
 * a canvas TextInput must not undo the study. With nothing focused (the event
 * targets <body>), only an app that owns the whole page (the standalone
 * build, marked `data-wrs-owns-page`) claims the key. Keys pressed inside a
 * dialog belong to the dialog.
 */
export function keyEventIsOurs(e, appRoot) {
  if (!appRoot || e.defaultPrevented || e.isComposing) return false;
  const t = e.target;
  const isPage = !t || t.nodeType !== 1 || t === document.body || t === document.documentElement;
  if (isPage) return appRoot.hasAttribute('data-wrs-owns-page');
  if (!appRoot.contains(t)) return false;
  return !t.closest?.('[role="dialog"]');
}
