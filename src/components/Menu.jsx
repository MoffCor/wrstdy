import { useEffect, useRef, useState } from 'react';

/**
 * Small accessible dropdown menu: opens on click, closes on outside click,
 * Escape, or selection; arrow keys move between items.
 */
export function Menu({ label, buttonClass = 'btn b-out btn-sm', items, align = 'right', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); rootRef.current?.querySelector('button')?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const btns = [...(listRef.current?.querySelectorAll('button:not([disabled])') || [])];
        const i = btns.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
        btns[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    listRef.current?.querySelector('button:not([disabled])')?.focus();
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="menu" ref={rootRef}>
      <button className={buttonClass} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className={'menu-list ' + align} role="menu" ref={listRef}>
          {items.filter(Boolean).map((it, i) => it.divider
            ? <div key={'d' + i} className="menu-div" role="separator" />
            : (
              <button
                key={it.label}
                role="menuitem"
                className={'menu-item' + (it.danger ? ' danger' : '')}
                disabled={it.disabled}
                data-readonly-safe={it.safe ? '' : undefined}
                onClick={() => { setOpen(false); it.onClick?.(); }}
              >
                {it.icon && <span className="menu-ic" aria-hidden="true">{it.icon}</span>}
                <span>
                  <span className="menu-l">{it.label}</span>
                  {it.hint && <span className="menu-h">{it.hint}</span>}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
