import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell: traps focus, closes on Escape and backdrop click,
 * and returns focus to whatever opened it. Used by the tour, the shortcuts
 * sheet, and the rate-design confirmations.
 */
export function Modal({ title, labelledBy, onClose, children, width = 520, className = '' }) {
  const panelRef = useRef(null);
  const openerRef = useRef(typeof document !== 'undefined' ? document.activeElement : null);

  useEffect(() => {
    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
    first?.focus();
    const opener = openerRef.current;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const a = items[0], b = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      // Return focus to the control that opened the dialog, if it still exists.
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={'modal ' + className} style={{ maxWidth: width }} ref={panelRef}>
        {children}
      </div>
    </div>
  );
}
