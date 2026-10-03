import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUDDY_JOKES, BUDDY_PROPS, IDLE_QUIPS, WAKE_LINES, DRAG_LINES, DIZZY_LINES,
  buddyOpening, buddyMetrics, buddyReaction, pick,
} from '../lib/buddy.js';

const W = 64;            // rendered figure width (px)
const MARGIN = 14;       // keep-out from the app's edges
const SLEEP_AFTER = 75_000;
const REACT_COOLDOWN = 7000;

// How long each one-shot pose plays before he settles back to rest.
const POSE_MS = {
  wave: 1600, jump: 900, flip: 950, spin: 1100, dance: 2600, fidget: 1700, think: 2400,
  look: 2200, tap: 2200, sit: 7000, whistle: 3200, celebrate: 2400, worry: 3000,
  thumbs: 1700, dizzy: 2800, land: 480, wake: 1000, moonwalk: 2400,
};
const TRICKS = ['jump', 'flip', 'spin', 'dance', 'moonwalk'];
const IDLES = ['fidget', 'think', 'look', 'tap', 'sit', 'whistle', 'look', 'tap'];
const RESTING = new Set(['idle', 'juggle']);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Reveal speech a few characters at a time, like he's actually talking.
function useTypewriter(text) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) return undefined;
    if (reducedMotion()) { setN(text.length); return undefined; }
    setN(0);
    const t = setInterval(() => setN(v => { if (v >= text.length) { clearInterval(t); return v; } return v + 2; }), 16);
    return () => clearInterval(t);
  }, [text]);
  return [text ? text.slice(0, n) : '', () => setN(text?.length || 0), n >= (text?.length || 0)];
}

function Prop({ kind }) {
  switch (kind) {
    case 'mug': return (
      <g className="b-prop" key="mug">
        <path className="b-steam" d="M45 52 q-2 -3 0 -6 q2 -3 0 -6" />
        <path className="b-steam s2" d="M49 52 q-2 -3 0 -6 q2 -3 0 -6" />
        <rect x="42" y="55" width="10" height="10" rx="2" className="b-p-white" />
        <path d="M52 57.5 h2 a2.5 2.5 0 0 1 0 5 h-2" className="b-p-line" />
      </g>);
    case 'clipboard': return (
      <g className="b-prop" key="clip">
        <rect x="40" y="53" width="12" height="15" rx="1.5" className="b-p-wood" />
        <rect x="42" y="56" width="8" height="10" className="b-p-white" />
        <rect x="43.5" y="51.5" width="5" height="3" rx="1" className="b-p-dark" />
        <path d="M43.5 59 h5 M43.5 61.5 h5 M43.5 64 h3" className="b-p-line thin" />
      </g>);
    case 'calculator': return (
      <g className="b-prop" key="calc">
        <rect x="40" y="53" width="12" height="15" rx="2" className="b-p-dark" />
        <rect x="42" y="55" width="8" height="3.5" rx=".5" className="b-p-screen" />
        {[0, 1, 2].map(r => [0, 1, 2].map(c => <rect key={`${r}${c}`} x={42 + c * 3} y={60.5 + r * 2.3} width="1.8" height="1.4" className="b-p-key" />))}
      </g>);
    case 'magnifier': return (
      <g className="b-prop" key="mag">
        <line x1="46" y1="60" x2="49" y2="56" className="b-p-handle" />
        <circle cx="52" cy="52" r="5" className="b-p-lens" />
        <path d="M49.5 50.5 a3 3 0 0 1 2.5 -1.8" className="b-p-glint" />
      </g>);
    case 'chart': return (
      <g className="b-prop" key="chart">
        <rect x="39" y="52" width="15" height="12" rx="1.5" className="b-p-white" />
        <rect x="41.5" y="58" width="2.5" height="4" className="b-p-bar" />
        <rect x="45.5" y="56" width="2.5" height="6" className="b-p-bar" />
        <rect x="49.5" y="54" width="2.5" height="8" className="b-p-bar hi" />
      </g>);
    case 'telescope': return (
      <g className="b-prop" key="scope">
        <path d="M43 62 L55 50 L58 53 L46 65 Z" className="b-p-brass" />
        <path d="M54 49 L59 54" className="b-p-line" />
      </g>);
    case 'bulb': return (
      <g className="b-prop" key="bulb">
        <circle cx="49" cy="53" r="9" className="b-p-glow" />
        <circle cx="49" cy="53" r="4.6" className="b-p-bulb" />
        <rect x="47" y="57" width="4" height="3.4" rx=".6" className="b-p-dark" />
      </g>);
    case 'report': return (
      <g className="b-prop" key="report">
        <path d="M41 53 h9 l3 3 v12 h-12 z" className="b-p-white" />
        <path d="M43.5 61 l2 2 l4 -5" className="b-p-check" />
      </g>);
    case 'juggle': return null;
    default: return (
      <path className="b-prop b-drop" key="drop" d="M47 59 c0 0 -4 5 -4 7.5 a4 4 0 0 0 8 0 c0 -2.5 -4 -7.5 -4 -7.5z" />
    );
  }
}

function Face({ expr }) {
  const eyes = {
    sleepy: <><path d="M26 23.5 q2 1.5 4 0" /><path d="M34 23.5 q2 1.5 4 0" /></>,
    excited: <><path d="M26 24 q2 -3 4 0" /><path d="M34 24 q2 -3 4 0" /></>,
    dizzy: <><path d="M26.5 21.5 l3 3 M29.5 21.5 l-3 3" /><path d="M34.5 21.5 l3 3 M37.5 21.5 l-3 3" /></>,
  }[expr];
  const mouth = {
    happy: 'M27.5 28 q4.5 4 9 0',
    excited: 'M27 27.5 q5 6.5 10 0 z',
    worried: 'M27.5 30.5 q4.5 -3.5 9 0',
    neutral: 'M28.5 29.5 h7',
    sleepy: 'M30.5 29.5 q1.5 1.2 3 0',
    dizzy: 'M27 29.5 q1.5 -2 3 0 t3 0 t3 0',
    surprised: 'M30 29.5 a2 2.5 0 1 0 4 0 a2 2.5 0 1 0 -4 0',
    whistle: 'M31 29.5 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0',
  }[expr] || 'M27.5 28 q4.5 4 9 0';
  return (
    <>
      {eyes
        ? <g className="b-eyes-alt">{eyes}</g>
        : <g className="b-eyes"><g className="b-pupils"><circle cx="28" cy="23" r="1.7" /><circle cx="36" cy="23" r="1.7" /></g></g>}
      {expr === 'worried' && <path className="b-brows" d="M25.5 19.5 l4 -1.4 M38.5 19.5 l-4 -1.4" />}
      <path className={'b-mouth' + (expr === 'excited' ? ' open' : '')} d={mouth} />
      {(expr === 'happy' || expr === 'excited') && <><circle className="b-blush" cx="24.5" cy="27" r="1.8" /><circle className="b-blush" cx="39.5" cy="27" r="1.8" /></>}
    </>
  );
}

/**
 * Drip — an animated stick-figure guide with opinions.
 *
 *   • Talks you through each screen, leading with whatever's wrong in the study.
 *   • "Show me" walks (or runs) him over to the thing; he points and it pulses.
 *   • Reacts to the numbers as you work: cheers fixes, celebrates a healthy
 *     budget coverage ratio with confetti, sweats when the system goes underwater.
 *   • Carries a different prop on every step; his eyes follow the pointer.
 *   • Fidgets, sits, whistles and taps his foot; falls asleep if you wander off.
 *   • Click for a trick and a joke (click too much and he gets dizzy); drag him
 *     anywhere along the bottom.
 *
 * Purely optional: the header toggle or the "B" key turns him off, and every
 * animation stops under the reduced-motion setting.
 */
export function StickBuddy({ context, study, onHide }) {
  const rootRef = useRef(null);
  const timers = useRef([]);
  const poseRef = useRef('enter');
  const lastActive = useRef(Date.now());
  const clicks = useRef([]);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const prevMetrics = useRef(buddyMetrics(study));
  const lastReact = useRef(0);

  const [tips, setTips] = useState(() => buddyOpening(context, study));
  const [idx, setIdx] = useState(0);
  const [bubble, setBubble] = useState(true);
  const [extra, setExtra] = useState(null);       // joke / reaction replacing the tip
  const [thought, setThought] = useState(null);   // small ephemeral aside
  const [pose, setPoseState] = useState('enter');
  const [moodOverride, setMoodOverride] = useState(null);
  const [x, setX] = useState(null);               // null = parked at home (bottom-right)
  const [face, setFace] = useState('left');
  const [confetti, setConfetti] = useState(null);
  const [dragging, setDragging] = useState(false);

  const prop = BUDDY_PROPS[context] || 'drop';
  const rest = prop === 'juggle' ? 'juggle' : 'idle';
  const setPose = useCallback((p) => {
    setPoseState(prev => { const next = typeof p === 'function' ? p(prev) : p; poseRef.current = next; return next; });
  }, []);

  const later = useCallback((fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; }, []);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  // Play a one-shot pose, then settle back to rest (unless something else took over).
  const act = useCallback((p, { mood, ms } = {}) => {
    setPose(p);
    if (mood) setMoodOverride(mood);
    later(() => {
      setPose(cur => (cur === p ? rest : cur));
      if (mood) setMoodOverride(m => (m === mood ? null : m));
    }, ms ?? POSE_MS[p] ?? 1500);
  }, [later, rest, setPose]);

  const say = useCallback((text, ms = 5200) => {
    setThought(text);
    later(() => setThought(t => (t === text ? null : t)), ms);
  }, [later]);

  const burst = useCallback(() => {
    const colors = ['#8fd11a', '#38bdf8', '#f59e0b', '#ec4899', '#1e3d3b', '#a78bfa'];
    setConfetti({
      key: Date.now(),
      bits: Array.from({ length: 22 }, (_, i) => ({
        dx: Math.round((Math.random() - 0.5) * 220),
        dy: Math.round(-60 - Math.random() * 120),
        r: Math.round(Math.random() * 720 - 360),
        c: colors[i % colors.length],
        d: Math.round(Math.random() * 120),
      })),
    });
    later(() => setConfetti(null), 1700);
  }, [later]);

  const appEl = () => rootRef.current?.closest('.wrs-app');
  const findTarget = (sel) => (sel ? appEl()?.querySelector(sel) : null);
  const tip = tips[idx % Math.max(1, tips.length)];

  // Only offer "Show me" when the target is on screen right now — checked
  // after each render because step content mounts alongside him.
  const [hasTarget, setHasTarget] = useState(false);
  useEffect(() => { setHasTarget(!!findTarget(tip?.target)); });

  const walkTo = useCallback((nextX, then) => {
    const app = appEl();
    const me = rootRef.current;
    if (!app || !me) return;
    const appRect = app.getBoundingClientRect();
    const cur = me.getBoundingClientRect().left - appRect.left;
    const max = appRect.width - W - MARGIN;
    const dest = nextX == null ? max : Math.max(MARGIN, Math.min(max, nextX));
    const dist = Math.abs(dest - cur);
    if (dist < 4) { setX(nextX == null ? null : dest); then?.(); return; }
    const running = dist > 380;
    const ms = Math.round(Math.min(2400, Math.max(450, dist * (running ? 1.7 : 3))));
    me.style.setProperty('--walk-ms', `${ms}ms`);
    setFace(dest < cur ? 'left' : 'right');
    setX(cur); // pin the current spot so the move animates
    requestAnimationFrame(() => {
      setPose(running ? 'run' : 'walk');
      setX(dest);
      later(() => { setPose(rest); if (nextX == null) { setX(null); setFace('left'); } then?.(); }, ms);
    });
  }, [later, rest, setPose]);

  // New screen: fresh script, a varied hello, and stroll home if he wandered.
  useEffect(() => {
    clearTimers();
    setIdx(0);
    setExtra(null);
    setThought(null);
    setMoodOverride(null);
    // On a phone-sized control the bubble would cover the step; start tucked
    // away (unless the study has a problem to flag) and let a tap open it.
    const tiny = !!appEl()?.classList.contains('xnarrow');
    const opening = buddyOpening(context, study);
    setTips(opening);
    setBubble(!tiny || opening.some(t => t.mood === 'worried'));
    if (tiny) later(() => say('Tap me for tips 👋', 4500), 1200);
    if (poseRef.current === 'enter') { later(() => act('wave'), 950); return; }
    const hello = () => act(pick(['wave', 'wave', 'jump', 'flip', 'spin', 'thumbs']));
    if (x != null) walkTo(null, hello); else hello();
    // study is read only on context change; live changes go through the
    // reaction effect below so he doesn't re-introduce himself per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // React to the study's numbers as they change (debounced past typing bursts).
  useEffect(() => {
    const t = setTimeout(() => {
      const next = buddyMetrics(study);
      const r = buddyReaction(prevMetrics.current, next);
      prevMetrics.current = next;
      if (!r || Date.now() - lastReact.current < REACT_COOLDOWN || dragging) return;
      lastReact.current = Date.now();
      if (poseRef.current === 'sleep') setPose(rest);
      act(r.pose, { mood: r.mood, ms: POSE_MS[r.pose] });
      if (r.pose === 'celebrate') burst();
      if (bubble) setExtra({ say: r.say, kind: 'reaction' }); else say(r.say);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study]);

  // Eyes follow the pointer; any input wakes him; idle time puts him to sleep.
  useEffect(() => {
    let raf = 0;
    const onMove = (e) => {
      lastActive.current = Date.now();
      if (poseRef.current === 'sleep') wakeRef.current();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = rootRef.current;
        const fig = el?.querySelector('.buddy-fig');
        if (!fig) return;
        const r = fig.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.23);
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 160);
        const flip = el.classList.contains('face-left') ? -1 : 1;
        el.style.setProperty('--ex', ((dx / len) * 1.4 * k * flip).toFixed(2));
        el.style.setProperty('--ey', ((dy / len) * 1.2 * k).toFixed(2));
      });
    };
    const onKey = () => { lastActive.current = Date.now(); if (poseRef.current === 'sleep') wakeRef.current(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKey);
    const t = setInterval(() => {
      if (RESTING.has(poseRef.current) && !drag.current && Date.now() - lastActive.current > SLEEP_AFTER) {
        setBubble(false);
        setThought(null);
        setPose('sleep');
      }
    }, 4000);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey); clearInterval(t); if (raf) cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wakeRef = useRef(null);
  wakeRef.current = () => {
    act('wake', { mood: 'surprised' });
    say(pick(WAKE_LINES), 4200);
  };

  // A little life between conversations: stretches, foot taps, sitting down…
  useEffect(() => {
    let t;
    const loop = () => {
      t = setTimeout(() => {
        if (RESTING.has(poseRef.current) && !drag.current) {
          act(pick(IDLES));
          if (!bubble && Math.random() < 0.4) say(pick(IDLE_QUIPS), 3600);
        }
        loop();
      }, 9000 + Math.random() * 8000);
    };
    loop();
    return () => clearTimeout(t);
  }, [act, bubble, say]);

  const nextTip = () => {
    setExtra(null);
    setBubble(true);
    setIdx(i => i + 1);
    act(pick(['wave', 'thumbs', 'look']));
  };

  const showMe = () => {
    const el = findTarget(tip?.target);
    if (!el) return;
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    later(() => {
      const app = appEl();
      if (!app) return;
      const a = app.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cx = r.left - a.left + Math.min(r.width, 260) / 2;
      walkTo(cx - W / 2 + 30, () => {
        const me = rootRef.current?.getBoundingClientRect();
        if (me) setFace(a.left + cx < me.left + W / 2 ? 'left' : 'right');
        act('point', { mood: 'excited', ms: 3300 });
        el.classList.remove('buddy-spot');
        void el.offsetWidth; // restart the pulse if it's already running
        el.classList.add('buddy-spot');
        later(() => el.classList.remove('buddy-spot'), 3300);
      });
    }, 380);
  };

  const poke = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    lastActive.current = Date.now();
    // Bubble tucked away: the first tap brings his tips back; tricks come after.
    if (!bubble) {
      setBubble(true);
      setExtra(null);
      setThought(null);
      act('jump', { mood: 'excited' });
      return;
    }
    const now = Date.now();
    clicks.current = [...clicks.current.filter(t => now - t < 2500), now];
    setBubble(true);
    if (clicks.current.length >= 4) {
      clicks.current = [];
      act('dizzy', { mood: 'dizzy' });
      setExtra({ say: pick(DIZZY_LINES), kind: 'joke' });
      return;
    }
    const trick = pick(TRICKS);
    act(trick, { mood: 'excited' });
    if (trick === 'dance') burst();
    setExtra({ say: pick(BUDDY_JOKES), kind: 'joke' });
  };

  // Drag him along the bottom edge.
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const app = appEl();
    const me = rootRef.current;
    if (!app || !me) return;
    const a = app.getBoundingClientRect();
    drag.current = { sx: e.clientX, left: me.getBoundingClientRect().left - a.left, max: a.width - W - MARGIN, moved: false, lastX: e.clientX };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) { d.moved = true; setDragging(true); setPose('dangle'); setBubble(false); }
    setFace(e.clientX < d.lastX ? 'left' : e.clientX > d.lastX ? 'right' : face);
    d.lastX = e.clientX;
    setX(Math.max(MARGIN, Math.min(d.max, d.left + dx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    suppressClick.current = true;
    setDragging(false);
    act('land', { mood: 'surprised' });
    say(pick(DRAG_LINES), 2600);
  };

  const goHome = () => { setBubble(false); setExtra(null); if (x != null) walkTo(null); };

  const text = extra?.say || tip?.say;
  const [typed, finishTyping, typedAll] = useTypewriter(bubble ? text : null);

  // Don't park a speech bubble over the user's work forever: once he's done
  // talking and nobody is hovering it, tuck it away. Clicking him brings it back.
  const hovering = useRef(false);
  useEffect(() => {
    if (!bubble || !typedAll) return undefined;
    const t = setTimeout(() => { if (!hovering.current) setBubble(false); }, 16000);
    return () => clearTimeout(t);
  }, [bubble, typedAll, text]);
  const appWidth = appEl()?.getBoundingClientRect().width || 0;
  const onLeftHalf = x != null && x < appWidth / 2;

  const expr = {
    sleep: 'sleepy', dizzy: 'dizzy', wake: 'surprised', land: 'surprised', whistle: 'whistle',
    celebrate: 'excited', dance: 'excited', flip: 'excited', spin: 'excited', moonwalk: 'excited', dangle: 'surprised',
    worry: 'worried', think: 'neutral',
  }[pose] || moodOverride || tip?.mood || 'happy';

  return (
    <div
      ref={rootRef}
      className={`buddy no-print pose-${pose} face-${face} expr-${expr} prop-${prop}${x == null ? ' home' : ''}${context === 'dashboard' ? '' : ' raised'}${dragging ? ' dragging' : ''}`}
      style={x == null ? undefined : { left: x }}
    >
      {bubble && text && (
        <div
          className={'buddy-bubble' + (onLeftHalf ? ' from-left' : '') + (extra ? ' ' + extra.kind : '')}
          onMouseEnter={() => { hovering.current = true; }}
          onMouseLeave={() => { hovering.current = false; }}
          onFocus={() => { hovering.current = true; }}
          onBlur={() => { hovering.current = false; }}
        >
          <button className="buddy-x" onClick={goHome} aria-label="Close Drip's tip">×</button>
          <div className="buddy-name">Drip <span>· {extra?.kind === 'joke' ? 'comedian (self-appointed)' : extra?.kind === 'reaction' ? 'just noticed' : 'your guide'}</span></div>
          <p onClick={finishTyping} aria-hidden="true">{typed}{!typedAll && <span className="buddy-caret" />}</p>
          <span className="sr-only" role="status" aria-live="polite">{text}</span>
          <div className="buddy-actions">
            {!extra && hasTarget && <button className="btn b-lime btn-xs" onClick={showMe}>👉 Show me</button>}
            {(tips.length > 1 || extra) && <button className="btn b-out btn-xs" onClick={nextTip}>{extra ? 'Back to tips' : 'Next tip'}</button>}
            <button className="link-btn buddy-off" onClick={onHide}>Hide Drip</button>
          </div>
        </div>
      )}
      {!bubble && thought && (
        <div className={'buddy-thought' + (onLeftHalf ? ' from-left' : '')} aria-live="polite">{thought}</div>
      )}
      {confetti && (
        <div className="buddy-confetti" key={confetti.key} aria-hidden="true">
          {confetti.bits.map((b, i) => (
            <i key={i} style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, '--r': `${b.r}deg`, '--c': b.c, animationDelay: `${b.d}ms` }} />
          ))}
        </div>
      )}
      <button
        className="buddy-fig"
        onClick={poke}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => { if (!bubble) { setBubble(true); setExtra(null); } }}
        aria-label="Drip, the stick-figure guide. Click for a trick and a joke; drag to move him."
        title="Click me! (or drag me)"
      >
        <svg viewBox="0 0 64 104" width={W} height={104} aria-hidden="true">
          <ellipse className="b-shadow" cx="32" cy="100" rx="16" ry="3" />
          <g className="b-flip"><g className="b-all">
            <g className="b-leg b-leg-l"><line x1="32" y1="64" x2="22" y2="94" /><line x1="22" y1="94" x2="16" y2="95" /></g>
            <g className="b-leg b-leg-r"><line x1="32" y1="64" x2="42" y2="94" /><line x1="42" y1="94" x2="48" y2="95" /></g>
            <g className="b-upper">
              <line className="b-body" x1="32" y1="36" x2="32" y2="64" />
              <g className="b-arm b-arm-l"><line x1="32" y1="42" x2="18" y2="60" /></g>
              <g className="b-arm b-arm-r">
                <line x1="32" y1="42" x2="46" y2="60" />
                <Prop kind={prop} />
              </g>
              <g className="b-head">
                <g className="b-head-track">
                  <circle className="b-face" cx="32" cy="24" r="11" />
                  <Face expr={expr} />
                  <path className="b-hat" d="M20 17 q12 -14 24 0 z" />
                  <rect className="b-brim" x="18" y="16" width="28" height="3" rx="1.5" />
                  <path className="b-sweat" d="M43.5 18 c0 0 -2 3 -2 4.4 a2 2 0 0 0 4 0 c0 -1.4 -2 -4.4 -2 -4.4z" />
                </g>
              </g>
              {prop === 'juggle' && (
                <g className="b-juggle">
                  {[0, 1, 2].map(i => <path key={i} className={'b-jdrop j' + i} d="M32 -21 c0 0 -3 4 -3 6 a3 3 0 0 0 6 0 c0 -2 -3 -6 -3 -6z" />)}
                </g>
              )}
            </g>
          </g></g>
          <g className="b-fx">
            <text className="b-z z1" x="44" y="12">z</text>
            <text className="b-z z2" x="49" y="6">z</text>
            <text className="b-z z3" x="54" y="0">Z</text>
            <text className="b-note n1" x="42" y="22">♪</text>
            <text className="b-note n2" x="48" y="14">♫</text>
            <text className="b-q" x="46" y="8">?</text>
            <g className="b-stars"><text x="20" y="6">✦</text><text x="38" y="2">✧</text><text x="29" y="-2">✦</text></g>
          </g>
        </svg>
      </button>
    </div>
  );
}
