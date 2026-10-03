import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOUR_DASHBOARD, TOUR_WORKSPACE } from '../lib/guide.js';
import { seasonal } from '../lib/buddy.js';
import { getSetting, setSetting } from '../platform/host.js';
import { DripFigure } from './StickBuddy.jsx';

export const TOUR_SEEN_KEY = 'wrs-tour-seen-v1';

export function hasSeenTour() {
  return getSetting(TOUR_SEEN_KEY) === '1';
}

const PAD = 8;      // breathing room around the spotlighted element
const GAP = 14;     // space between the spotlight and the card
const CARD_W = 380;

/**
 * Guided tour, hosted by Drip. Each stop spotlights the real control it talks
 * about: the rest of the app is dimmed (never blurred) and the target is cut
 * out of the dim layer with a pulsing ring, so the user sees exactly what is
 * being described. Stops whose target isn't on screen are skipped. Inside a
 * study it tours the workspace instead of the dashboard.
 */
export function WelcomeTour({ onClose, onStart, onSample, inWorkspace = false }) {
  const rootRef = useRef(null);
  const nextRef = useRef(null);
  const [stops, setStops] = useState([]);
  const [i, setI] = useState(0);
  const [box, setBox] = useState(null);   // spotlight rect, app CSS px
  const [app, setApp] = useState({ w: 0, h: 0 });
  const badge = seasonal().badge;

  const appEl = () => rootRef.current?.closest('.wrs-app');
  const find = (sel) => (sel ? appEl()?.querySelector(sel) : null);

  // Only keep stops whose target exists right now (plus untargeted ones).
  useLayoutEffect(() => {
    const all = inWorkspace ? TOUR_WORKSPACE : TOUR_DASHBOARD;
    setStops(all.filter(s => !s.target || find(s.target)));
    setI(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inWorkspace]);

  const stop = stops[i];
  const last = i === stops.length - 1;

  // Measure the target in the app's own (zoomed) CSS pixels, and keep the
  // spotlight on it through scrolling and resizing.
  useLayoutEffect(() => {
    const a = appEl();
    if (!a || !stop) return undefined;
    const el = find(stop.target);
    el?.scrollIntoView?.({ block: 'nearest' });
    const measure = () => {
      const ar = a.getBoundingClientRect();
      const scale = a.offsetWidth ? ar.width / a.offsetWidth : 1;
      setApp({ w: ar.width / scale, h: ar.height / scale });
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      const W = ar.width / scale, H = ar.height / scale;
      // Keep the ring inside the app so a full-width target isn't cut off.
      const x = Math.max(3, (r.left - ar.left) / scale - PAD);
      const y = Math.max(3, (r.top - ar.top) / scale - PAD);
      setBox({
        x, y,
        w: Math.min(W - 3, (r.right - ar.left) / scale + PAD) - x,
        h: Math.min(H - 3, (r.bottom - ar.top) / scale + PAD) - y,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  useEffect(() => { nextRef.current?.focus(); }, [i, stops.length]);

  const finish = (after) => {
    setSetting(TOUR_SEEN_KEY, '1');
    onClose?.();
    after?.();
  };
  const go = (n) => setI(Math.max(0, Math.min(stops.length - 1, n)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (e.key === 'ArrowRight' && !e.altKey) { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft' && !e.altKey) { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!stop) return <div ref={rootRef} />;

  // Card placement: below the spotlight if it fits, else above, else beside;
  // centered when there is nothing to point at.
  const cardW = Math.min(CARD_W, app.w - 24);
  let card;
  let tail = null;
  if (!box) {
    card = { left: (app.w - cardW) / 2, top: Math.max(24, app.h / 2 - 170) };
  } else {
    const left = Math.max(12, Math.min(app.w - cardW - 12, box.x + box.w / 2 - cardW / 2));
    const below = box.y + box.h + GAP;
    const roomBelow = app.h - below;
    if (roomBelow >= 250) { card = { left, top: below }; tail = 'up'; }
    else if (box.y - GAP >= 250) { card = { left, bottom: app.h - box.y + GAP }; tail = 'down'; }
    else {
      const beside = box.x + box.w + GAP;
      card = beside + cardW < app.w
        ? { left: beside, top: Math.max(12, Math.min(app.h - 300, box.y)) }
        : { left: Math.max(12, box.x - cardW - GAP), top: Math.max(12, Math.min(app.h - 300, box.y)) };
    }
  }
  const tailX = box ? Math.max(24, Math.min(cardW - 24, box.x + box.w / 2 - card.left)) : 0;

  return (
    <div className="tour-layer" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* The dim layer is the spotlight's own shadow, so the target stays fully
          visible and crisp; a click anywhere outside the card is swallowed. */}
      <div className="tour-catch" onMouseDown={e => e.preventDefault()} />
      {box
        ? <div className="tour-spot" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
        : <div className="tour-dim" />}
      <div className={'tour-card' + (tail ? ' tail-' + tail : '')} style={{ ...card, width: cardW, '--tail-x': `${tailX}px` }} key={i}>
        <div className="tour-host">
          <div className={`buddy tour-buddy pose-${stop.pose || 'wave'} face-right expr-${stop.pose === 'think' ? 'neutral' : 'happy'}`} aria-hidden="true">
            <DripFigure prop={i === 0 ? 'mug' : 'clipboard'} expr={stop.pose === 'think' ? 'neutral' : stop.pose === 'celebrate' ? 'excited' : 'happy'} badge={badge} />
          </div>
          <div className="tour-say">{stop.drip}</div>
        </div>
        <div className="tour-step-count">Stop {i + 1} of {stops.length}</div>
        <h3 id="tour-title">{stop.title}</h3>
        <p className="tour-text">{stop.body}</p>
        <div className="tour-dots" role="tablist" aria-label="Tour progress">
          {stops.map((t, n) => (
            <button
              key={t.title}
              role="tab"
              aria-selected={n === i}
              aria-label={`Go to stop ${n + 1}: ${t.title}`}
              className={'tour-dot' + (n === i ? ' on' : '')}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <div className="tour-actions">
          <button className="btn b-ghost-dark btn-sm" onClick={() => finish()}>Skip tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn b-out btn-sm" onClick={() => go(i - 1)}>← Back</button>}
            {!last && <button ref={nextRef} className="btn b-teal btn-sm" onClick={() => go(i + 1)}>Next →</button>}
            {last && !inWorkspace && onSample && <button className="btn b-out btn-sm" onClick={() => finish(onSample)}>Explore the sample</button>}
            {last && <button ref={nextRef} className="btn b-lime btn-sm" onClick={() => finish(inWorkspace ? null : onStart)}>{inWorkspace || !onStart ? 'Done' : 'Start a study'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
