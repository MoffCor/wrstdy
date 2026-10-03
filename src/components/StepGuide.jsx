import { STEP_GUIDES, SHORTCUTS, TOUR_STEPS } from '../lib/guide.js';
import { getSetting, setSetting } from '../platform/host.js';
import { useState } from 'react';
import { Modal } from './Modal.jsx';

const COLLAPSE_KEY = 'wrs-step-guides-collapsed';

/**
 * A collapsible coaching panel at the top of each step. Remembers whether the
 * analyst has collapsed guides, so experienced staff hide them once and new
 * staff see them by default.
 */
export function StepGuide({ step, onTour }) {
  const g = STEP_GUIDES[step];
  const [open, setOpen] = useState(() => getSetting(COLLAPSE_KEY) !== '1');
  if (!g) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    setSetting(COLLAPSE_KEY, next ? '' : '1');
  };
  return (
    <section className={'step-guide no-print' + (open ? ' open' : '')} aria-label={`Guide: ${g.title}`}>
      <button className="step-guide-head" onClick={toggle} aria-expanded={open}>
        <span className="step-guide-badge" aria-hidden="true">{step + 1}</span>
        <span className="step-guide-title">
          <strong>{g.title}</strong>
          <span>{g.purpose}</span>
        </span>
        <span className="step-guide-toggle">{open ? 'Hide guide' : 'Show guide'}</span>
      </button>
      {onTour && TOUR_STEPS[step] && (
        <button className="step-guide-tour" onClick={() => onTour(step)} title="Spotlight this step's key sections, with Drip">
          🧭 Tour this step
        </button>
      )}
      {open && (
        <div className="step-guide-body">
          <div>
            <h4>You'll need</h4>
            <ul>{g.need.map(n => <li key={n}>{n}</li>)}</ul>
          </div>
          <div>
            <h4>Tips</h4>
            <ul>{g.tips.map(t => <li key={t}>{t}</li>)}</ul>
          </div>
          <div className="step-guide-pitfall">
            <h4>Watch out for</h4>
            <p>{g.pitfall}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ShortcutsModal({ onClose }) {
  return (
    <Modal labelledBy="kbd-title" onClose={onClose} width={420}>
      <h3 id="kbd-title" style={{ fontSize: 16, color: 'var(--teal)' }}>Keyboard shortcuts</h3>
      <table className="kbd-table">
        <tbody>
          {SHORTCUTS.map(s => (
            <tr key={s.label}>
              <td>{s.keys.map((k, i) => <span key={k}>{i > 0 && <span className="kbd-plus">+</span>}<kbd>{k}</kbd></span>)}</td>
              <td>{s.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11.5, color: 'var(--mid)', marginTop: 12 }}>
        On a Mac, use <kbd>⌘</kbd> in place of <kbd>Ctrl</kbd> and <kbd>⌥</kbd> for <kbd>Alt</kbd>.
        Undo applies to the open study; inside a text box, the box's own undo still works.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn b-teal btn-sm" data-autofocus onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
