import { useState } from 'react';
import { Modal } from './Modal.jsx';
import { TOUR } from '../lib/guide.js';
import { getSetting, setSetting } from '../platform/host.js';

export const TOUR_SEEN_KEY = 'wrs-tour-seen-v1';

export function hasSeenTour() {
  return getSetting(TOUR_SEEN_KEY) === '1';
}

/**
 * First-run welcome tour. Five short screens; every one is skippable, and the
 * tour can be reopened from the Guide button in the header.
 */
export function WelcomeTour({ onClose, onStart, onSample }) {
  const [i, setI] = useState(0);
  const slide = TOUR[i];
  const last = i === TOUR.length - 1;
  const finish = (after) => {
    setSetting(TOUR_SEEN_KEY, '1');
    onClose?.();
    after?.();
  };

  return (
    <Modal labelledBy="tour-title" onClose={() => finish()} width={560} className="tour">
      <div className="tour-hero" aria-hidden="true">
        <span className="tour-icon">{slide.icon}</span>
        <svg className="tour-wave" viewBox="0 0 560 60" preserveAspectRatio="none">
          <path d="M0 30 Q 70 0 140 30 T 280 30 T 420 30 T 560 30 V60 H0Z" fill="rgba(255,255,255,.12)" />
          <path d="M0 40 Q 70 15 140 40 T 280 40 T 420 40 T 560 40 V60 H0Z" fill="#fff" />
        </svg>
      </div>
      <div className="tour-body">
        <div className="tour-step-count">Step {i + 1} of {TOUR.length}</div>
        <h3 id="tour-title">{slide.title}</h3>
        <p className="tour-text">{slide.body}</p>
        <ul className="tour-points">
          {slide.points.map(p => <li key={p}>{p}</li>)}
        </ul>
        <div className="tour-dots" role="tablist" aria-label="Tour progress">
          {TOUR.map((t, n) => (
            <button
              key={t.title}
              role="tab"
              aria-selected={n === i}
              aria-label={`Go to tour screen ${n + 1}: ${t.title}`}
              className={'tour-dot' + (n === i ? ' on' : '')}
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <div className="tour-actions">
          <button className="btn b-ghost-dark btn-sm" onClick={() => finish()}>Skip tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn b-out btn-sm" onClick={() => setI(i - 1)}>← Back</button>}
            {!last && <button className="btn b-teal btn-sm" data-autofocus onClick={() => setI(i + 1)}>Next →</button>}
            {last && onSample && <button className="btn b-out btn-sm" onClick={() => finish(onSample)}>Explore the sample</button>}
            {last && <button className="btn b-lime btn-sm" data-autofocus onClick={() => finish(onStart)}>{onStart ? 'Start a study' : 'Get started'}</button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
