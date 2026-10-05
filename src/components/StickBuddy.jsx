import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUDDY_JOKES, BUDDY_PROPS, IDLE_QUIPS, WAKE_LINES, DRAG_LINES, DIZZY_LINES,
  BUDDY_EVENTS, BYE_LINES, BACK_LINES, COFFEE_LINES, COFFEE_BACK_LINES, TYPING_LINES,
  HOVER_LINES, MEDITATE_LINES, WATCH_LINES, TOUR_DONE_LINE,
  LADDER_LINES, BALLOON_LINES, UMBRELLA_LINES, FLY_LINES,
  PHONE_CALLS, WATER_LINES, SWEEP_LINES, READ_LINES, LEAN_LINES, PERCH_LINES, WELCOME_BACK_LINES,
  plantStage,
  buddyOpening, buddyMetrics, buddyReaction, pick, seasonal,
} from '../lib/buddy.js';
import { onBuddyEvent } from '../lib/buddyBus.js';
import { getSetting, setSetting } from '../platform/host.js';

const W = 64;
const PLANT_SETTING = 'wrs-buddy-plant';            // rendered figure width (px)
const MARGIN = 14;       // keep-out from the app's edges
const SLEEP_AFTER = 75_000;
const REACT_COOLDOWN = 7000;

// How long each one-shot pose plays before he settles back to rest.
const POSE_MS = {
  wave: 1600, jump: 900, flip: 950, spin: 1100, dance: 2600, fidget: 1700, think: 2400,
  look: 2200, tap: 2200, sit: 7000, whistle: 3200, celebrate: 2400, worry: 3000,
  thumbs: 1700, dizzy: 2800, land: 480, wake: 1000, moonwalk: 2400,
  rewind: 1100, throw: 1100, sad: 3400, scribble: 2200, shy: 1500, meditate: 5200,
  kick: 1400, watch: 2400, emerge: 700, exit: 800,
  water: 2800, sweep: 3200, read: 4600, lean: 6500, clap: 800,
};
const TRICKS = ['jump', 'flip', 'spin', 'dance', 'moonwalk'];
// What he gets up to between conversations. Weighted by repetition: small,
// quick things often; the bigger outings (a coffee run, climbing onto a card)
// rarely, so they stay a surprise.
const IDLES = [
  'look', 'look', 'tap', 'fidget', 'think', 'whistle', 'sit', 'watch', 'kick',
  'water', 'water', 'read', 'sweep', 'phone', 'lean', 'meditate',
  'perch', 'coffee',
];
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
    case 'can': return (
      <g className="b-prop" key="can">
        <path d="M40 56 h11 v9 a2 2 0 0 1 -2 2 h-7 a2 2 0 0 1 -2 -2z" className="b-p-can" />
        <path d="M51 58 l7 -5" className="b-p-spout" />
        <path d="M42 56 q3.5 -5 7 0" className="b-p-line" />
      </g>);
    case 'phone': return (
      <g className="b-prop" key="phone">
        <rect x="43" y="53" width="5.5" height="9.5" rx="1.2" className="b-p-dark" />
        <rect x="44" y="54.5" width="3.5" height="5.5" rx=".4" className="b-p-screen" />
      </g>);
    case 'broom': return (
      <g className="b-prop" key="broom">
        <line x1="44" y1="54" x2="60" y2="92" className="b-p-handle" />
        <path d="M56 88 l10 -4 l4 10 l-12 4z" className="b-p-bristle" />
      </g>);
    case 'book': return (
      <g className="b-prop" key="book">
        <path d="M37 52 l9 2 l9 -2 v11 l-9 2 l-9 -2z" className="b-p-white" />
        <path d="M46 54 v11" className="b-p-line thin" />
        <path className="b-page" d="M46 54 l8 -1.6 v10 l-8 1.6z" />
      </g>);
    case 'juggle': return null;
    default: return (
      <path className="b-prop b-drop" key="drop" d="M47 59 c0 0 -4 5 -4 7.5 a4 4 0 0 0 8 0 c0 -2.5 -4 -7.5 -4 -7.5z" />
    );
  }
}

// A small seasonal touch on the hard hat.
function Badge({ kind }) {
  switch (kind) {
    case 'pumpkin': return (
      <g className="b-badge">
        <ellipse cx="38" cy="12.6" rx="3" ry="2.5" className="b-pumpkin" />
        <path d="M38 10.2 q.4 -1.4 1.4 -1.8" className="b-stem" />
      </g>);
    case 'snow': return (
      <g className="b-badge">{[[24, 13], [29, 9.5], [35, 9.2], [40, 12.5]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1.3" className="b-snow" />)}</g>);
    case 'party': return <path className="b-badge b-party" d="M38 3 l1.2 3 l3 .4 l-2.3 2 l.7 3 l-2.6 -1.6 l-2.6 1.6 l.7 -3 l-2.3 -2 l3 -.4z" />;
    case 'sun': return (
      <g className="b-badge">
        <rect x="24.5" y="20.5" width="6.5" height="4.2" rx="1.4" className="b-shades" />
        <rect x="33" y="20.5" width="6.5" height="4.2" rx="1.4" className="b-shades" />
        <path d="M31 22 h2" className="b-shades-bridge" />
      </g>);
    default: return null;
  }
}

function Face({ expr }) {
  const eyes = {
    calm: <><path d="M26 23.5 q2 1.5 4 0" /><path d="M34 23.5 q2 1.5 4 0" /></>,
    sleepy: <><path d="M26 23.5 q2 1.5 4 0" /><path d="M34 23.5 q2 1.5 4 0" /></>,
    excited: <><path d="M26 24 q2 -3 4 0" /><path d="M34 24 q2 -3 4 0" /></>,
    dizzy: <><path d="M26.5 21.5 l3 3 M29.5 21.5 l-3 3" /><path d="M34.5 21.5 l3 3 M37.5 21.5 l-3 3" /></>,
  }[expr];
  const mouth = {
    happy: 'M27.5 28 q4.5 4 9 0',
    excited: 'M27 27.5 q5 6.5 10 0 z',
    worried: 'M27.5 30.5 q4.5 -3.5 9 0',
    sad: 'M27.5 31 q4.5 -4 9 0',
    calm: 'M28.5 28.5 q3.5 2.5 7 0',
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
      {(expr === 'worried' || expr === 'sad') && <path className="b-brows" d="M25.5 19.5 l4 -1.4 M38.5 19.5 l-4 -1.4" />}
      {expr === 'sad' && <path className="b-tear" d="M27 26 c0 0 -1.6 2.4 -1.6 3.4 a1.6 1.6 0 0 0 3.2 0 c0 -1 -1.6 -3.4 -1.6 -3.4z" />}
      <path className={'b-mouth' + (expr === 'excited' ? ' open' : '')} d={mouth} />
      {(expr === 'happy' || expr === 'excited') && <><circle className="b-blush" cx="24.5" cy="27" r="1.8" /><circle className="b-blush" cx="39.5" cy="27" r="1.8" /></>}
    </>
  );
}

// His desk plant. Stage 1 is a sprout; by stage 4 it has a flower.
function Plant({ stage }) {
  return (
    <svg viewBox="0 0 30 44" width="30" height="44">
      <path className="pl-stem" d={stage >= 3 ? 'M15 33 q-2 -12 1 -24' : stage === 2 ? 'M15 33 q-1 -8 0 -16' : 'M15 33 v-8'} />
      <ellipse className="pl-leaf" cx="11" cy={stage >= 2 ? 26 : 26} rx="4.5" ry="2.2" transform={`rotate(-30 11 ${26})`} />
      <ellipse className="pl-leaf" cx="19" cy="27" rx="4.5" ry="2.2" transform="rotate(30 19 27)" />
      {stage >= 2 && <ellipse className="pl-leaf" cx="10.5" cy="19" rx="4" ry="2" transform="rotate(-35 10.5 19)" />}
      {stage >= 3 && <ellipse className="pl-leaf" cx="20" cy="15" rx="4" ry="2" transform="rotate(35 20 15)" />}
      {stage >= 4 && <><circle className="pl-petal" cx="16" cy="7" r="3.6" /><circle className="pl-center" cx="16" cy="7" r="1.5" /></>}
      <path className="pl-pot" d="M7 33 h16 l-2 10 h-12z" />
      <rect className="pl-rim" x="6" y="31" width="18" height="3" rx="1" />
    </svg>
  );
}

/**
 * Drip himself — the SVG figure, with no behaviour. Poses and moods come from
 * classes on an ancestor (`.buddy.pose-wave`, `.expr-…`), so the same figure
 * animates in the corner and inside the guided tour.
 */
export function DripFigure({ prop = 'drop', expr = 'happy', badge = null }) {
  return (
    <svg viewBox="0 0 64 104" width={W} height={104} aria-hidden="true">
      <ellipse className="b-shadow" cx="32" cy="100" rx="16" ry="3" />
      <g className="b-flip"><g className="b-all">
        {/* Two-segment limbs: hips/shoulders rotate the whole limb, knees and
            elbows bend the lower half. */}
        <g className="b-leg b-leg-l">
          <line x1="32" y1="64" x2="27" y2="79" />
          <g className="b-shin b-shin-l"><line x1="27" y1="79" x2="22" y2="94" /><line x1="22" y1="94" x2="16" y2="95" /></g>
        </g>
        <g className="b-leg b-leg-r">
          <line x1="32" y1="64" x2="37" y2="79" />
          <g className="b-shin b-shin-r"><line x1="37" y1="79" x2="42" y2="94" /><line x1="42" y1="94" x2="48" y2="95" /></g>
        </g>
        <g className="b-upper">
          <line className="b-body" x1="32" y1="36" x2="32" y2="64" />
          <g className="b-arm b-arm-l">
            <line x1="32" y1="42" x2="25" y2="51" />
            <g className="b-fore b-fore-l"><line x1="25" y1="51" x2="18" y2="60" /></g>
          </g>
          <g className="b-arm b-arm-r">
            <line x1="32" y1="42" x2="39" y2="51" />
            <g className="b-fore b-fore-r">
              <line x1="39" y1="51" x2="46" y2="60" />
              <Prop kind={prop} />
              <g className="b-balloon"><path d="M46 60 q-3 -18 4 -34" className="b-string" /><ellipse cx="50" cy="20" rx="8" ry="10" className="b-balloon-body" /><path d="M47 15 a3 4 0 0 1 3 -3" className="b-p-glint" /></g>
              <g className="b-umbrella"><path d="M46 60 v-30" className="b-string" /><path d="M30 31 q16 -20 32 0 q-4 -3 -8 0 q-4 -3 -8 0 q-4 -3 -8 0 q-4 -3 -8 0z" className="b-canopy" /></g>
            </g>
          </g>
          <g className="b-head">
            <g className="b-head-track">
              <circle className="b-face" cx="32" cy="24" r="11" />
              <Face expr={expr} />
              <g className="b-hatg">
                <path className="b-hat" d="M20 17 q12 -14 24 0 z" />
                <rect className="b-brim" x="18" y="16" width="28" height="3" rx="1.5" />
                <Badge kind={badge} />
              </g>
              <path className="b-sweat" d="M43.5 18 c0 0 -2 3 -2 4.4 a2 2 0 0 0 4 0 c0 -1.4 -2 -4.4 -2 -4.4z" />
            </g>
          </g>
          {prop === 'juggle' && (
            <g className="b-juggle">
              {[0, 1, 2].map(i => <path key={i} className={'b-jdrop j' + i} d="M32 -21 c0 0 -3 4 -3 6 a3 3 0 0 0 6 0 c0 -2 -3 -6 -3 -6z" />)}
            </g>
          )}
        </g>
      </g>
        {/* Ground effects: in the flip group (so "behind him" follows his
            direction) but outside b-all (so they stay on the ground). */}
        <g className="b-dust"><circle cx="16" cy="96" r="2.4" /><circle cx="10" cy="95" r="1.8" /><circle cx="22" cy="97" r="1.5" /></g>
        <g className="b-water"><circle cx="63" cy="64" r="1.3" /><circle cx="66" cy="72" r="1.2" /><circle cx="69" cy="81" r="1.1" /></g>
        <g className="b-sweepdust"><circle cx="70" cy="95" r="2" /><circle cx="76" cy="93" r="1.5" /><circle cx="73" cy="97" r="1.2" /></g>
      </g>
      <g className="b-fx">
        <text className="b-z z1" x="44" y="12">z</text>
        <text className="b-z z2" x="49" y="6">z</text>
        <text className="b-z z3" x="54" y="0">Z</text>
        <text className="b-note n1" x="42" y="22">♪</text>
        <text className="b-note n2" x="48" y="14">♫</text>
        <text className="b-q" x="46" y="8">?</text>
        <text className="b-rw" x="40" y="10">⏪</text>
        <text className="b-om" x="38" y="16">ommm</text>
        <circle className="b-pebble" cx="50" cy="96" r="2.2" />
        <g className="b-cloud" transform="translate(0 -9)">
          <path d="M18 2 a5 5 0 0 1 8 -4 a6 6 0 0 1 11 1 a4.5 4.5 0 0 1 2 8.5 h-19 a3.8 3.8 0 0 1 -2 -5.5z" />
          <line className="rd1" x1="23" y1="9" x2="22" y2="13" />
          <line className="rd2" x1="29" y1="9" x2="28" y2="13" />
          <line className="rd3" x1="35" y1="9" x2="34" y2="13" />
        </g>
        <g className="b-stars"><text x="20" y="6">✦</text><text x="38" y="2">✧</text><text x="29" y="-2">✦</text></g>
      </g>
    </svg>
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
export function StickBuddy({ context, study, onHide, leaving = false, onGone }) {
  const rootRef = useRef(null);
  const timers = useRef([]);
  const poseRef = useRef('idle');
  const firstRef = useRef(true);       // first screen after mounting: enter through the door
  const busyRef = useRef(false);       // mid door sequence: nothing else may interrupt
  const lastEventRef = useRef(0);      // when the app last told him something
  const visitedRef = useRef(new Set()); // steps seen, for the grand-tour achievement
  const tourDoneRef = useRef(false);
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
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
  const [pose, setPoseState] = useState('idle');
  const [moodOverride, setMoodOverride] = useState(null);
  const [x, setX] = useState(null);               // null = parked at home (bottom-right)
  const [y, setY] = useState(null);
  const [ladder, setLadder] = useState(null);     // { left, bottom, height, state }               // CSS bottom offset; null = on the floor
  const [face, setFace] = useState('left');
  const [confetti, setConfetti] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [door, setDoor] = useState('hidden');      // hidden | shut | open
  const [away, setAway] = useState(true);          // through the door, out of sight
  const [propOverride, setPropOverride] = useState(null); // e.g. the mug after a coffee run
  const [plane, setPlane] = useState(null);        // paper airplane after an export
  const badge = useMemo(() => seasonal().badge, []);
  // His plant: planted the first time he appears, grows with the days.
  const plant = useMemo(() => {
    let since = getSetting(PLANT_SETTING);
    if (!since) { since = new Date().toISOString(); setSetting(PLANT_SETTING, since); }
    return plantStage(since);
  }, []);
  const [plantPerk, setPlantPerk] = useState(0);
  const [balloonAway, setBalloonAway] = useState(null);
  const perchRef = useRef(false);
  // Props an activity borrows (the watering can, the phone…). Restored on a
  // timer of its own, so an interruption that clears his other timers can't
  // leave him holding a broom forever.
  const propTimer = useRef(null);
  const withProp = useCallback((kind, ms) => {
    clearTimeout(propTimer.current);
    setPropOverride(kind);
    propTimer.current = setTimeout(() => setPropOverride(p => (p === kind ? null : p)), ms);
  }, []);
  useEffect(() => () => clearTimeout(propTimer.current), []);
  const bubbleRef = useRef(true);
  bubbleRef.current = bubble;

  const prop = propOverride || BUDDY_PROPS[context] || 'drop';
  const rest = prop === 'juggle' ? 'juggle' : 'idle';
  const setPose = useCallback((p) => {
    setPoseState(prev => { const next = typeof p === 'function' ? p(prev) : p; poseRef.current = next; return next; });
  }, []);

  const later = useCallback((fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; }, []);
  const spotRef = useRef(null); // the element currently pulsing from "Show me"
  const clearSpot = () => { spotRef.current?.classList.remove('buddy-spot'); spotRef.current = null; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; clearSpot(); };
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
  // The app is CSS-zoomed by the text-size setting, so screen pixels from
  // getBoundingClientRect are `scale` times the CSS pixels `left` is set in.
  const metrics = () => {
    const app = appEl();
    if (!app) return null;
    const rect = app.getBoundingClientRect();
    const scale = app.offsetWidth ? rect.width / app.offsetWidth : 1;
    const myW = rootRef.current?.offsetWidth || W;
    const myH = rootRef.current?.offsetHeight || 104;
    const height = rect.height / scale;
    return { rect, scale, width: rect.width / scale, height, max: rect.width / scale - myW - MARGIN, maxY: height - myH - MARGIN };
  };
  const findTarget = (sel) => (sel ? appEl()?.querySelector(sel) : null);
  const tip = tips[idx % Math.max(1, tips.length)];

  // Only offer "Show me" when the target is on screen right now — checked
  // after each render because step content mounts alongside him.
  const [hasTarget, setHasTarget] = useState(false);
  useEffect(() => { setHasTarget(!!findTarget(tip?.target)); });

  // Walk (or, when the trip includes a climb, fly) to a spot. `nextX` null
  // means home; `nextY` is a CSS bottom offset, null meaning the floor.
  // Getting somewhere. Along the same level he walks (or runs, if it's far).
  // A change of height is a two-part trip: walk across first, then go up or
  // down by whatever's handy — a ladder he props up, a balloon, an umbrella
  // on the way down, or (rarely) just flying. `nextX` null means home;
  // `nextY` is a CSS bottom offset, null meaning the floor.
  const walkTo = useCallback((nextX, then, nextY = null) => {
    const m = metrics();
    const me = rootRef.current;
    if (!m || !me) return;
    const r = me.getBoundingClientRect();
    const cur = (r.left - m.rect.left) / m.scale;
    const curY = (m.rect.bottom - r.bottom) / m.scale;
    const myH = me.offsetHeight || 104;
    const floor = me.classList.contains('raised') ? 58 : 10;
    const dest = nextX == null ? m.max : Math.max(MARGIN, Math.min(m.max, nextX));
    const destY = nextY == null ? floor : Math.max(MARGIN, Math.min(m.maxY, nextY));
    const home = () => { if (nextX == null) { setX(null); setFace('left'); } if (nextY == null) setY(null); };
    if (Math.hypot(dest - cur, destY - curY) < 4) { setX(nextX == null ? null : dest); setY(nextY == null ? null : destY); then?.(); return; }

    setX(cur); // pin the current spot so the move animates
    setY(curY);

    const vertical = (after) => {
      const dy = destY - curY;
      if (Math.abs(dy) <= 30) { setY(destY); after(); return; }
      const up = dy > 0;
      const mode = reducedMotion() ? 'fly'
        : up ? pick(['ladder', 'ladder', 'ladder', 'balloon', 'fly'])
          : pick(['ladder', 'ladder', 'umbrella', 'umbrella']);
      const ms = Math.round(Math.min(2600, Math.max(700, Math.abs(dy) * (mode === 'ladder' ? 7 : 3.2))));
      const go = () => {
        me.style.setProperty('--walk-ms', `${ms}ms`);
        setPose(mode === 'ladder' ? 'climb' : mode === 'fly' ? 'fly' : mode);
        requestAnimationFrame(() => setY(destY));
        later(() => {
          if (mode === 'balloon') {
            // He lets go at the top; the balloon carries on without him.
            setBalloonAway({ key: Date.now(), left: dest + 40, bottom: destY + 70 });
            later(() => setBalloonAway(null), 3400);
          }
          if (mode === 'ladder' && up) {
            // Dust off the hands before getting on with it.
            setPose('clap');
            later(after, POSE_MS.clap);
          } else after();
        }, ms);
      };
      if (mode === 'ladder') {
        // Prop the ladder up, climb, fold it away behind him.
        const bottom = Math.min(curY, destY);
        setLadder({ left: dest + 15, bottom, height: Math.abs(dy) + myH * 0.9, state: 'up', key: Date.now() });
        setFace('right');
        if (Math.random() < 0.3) say(pick(LADDER_LINES), 2400);
        later(go, 450);
        later(() => setLadder(l => (l ? { ...l, state: 'fold' } : l)), 450 + ms + 150);
        later(() => setLadder(null), 450 + ms + 600);
      } else {
        if (Math.random() < 0.3) say(pick(mode === 'balloon' ? BALLOON_LINES : mode === 'umbrella' ? UMBRELLA_LINES : FLY_LINES), 2400);
        go();
      }
    };

    const horizontal = (after) => {
      const dist = Math.abs(dest - cur);
      if (dist < 4) { after(); return; }
      const running = dist > 380;
      const ms = Math.round(Math.min(2400, Math.max(450, dist * (running ? 1.7 : 3))));
      me.style.setProperty('--walk-ms', `${ms}ms`);
      setFace(dest < cur ? 'left' : 'right');
      requestAnimationFrame(() => {
        setPose(running ? 'run' : 'walk');
        setX(dest);
        later(after, ms);
      });
    };

    const done = () => { setPose(rest); home(); then?.(); };
    // Going up: walk over, then climb. Coming down: get down first, then walk.
    if (destY >= curY) horizontal(() => vertical(done));
    else vertical(() => horizontal(done));
  }, [later, rest, setPose, say]);

  // In through the door at the side of the app: it swings open, he steps out,
  // waves, and it closes behind him.
  const enterThroughDoor = (line) => {
    clearTimers();
    busyRef.current = true;
    setX(null);
    setFace('left');
    setAway(true);
    setDoor('shut');
    later(() => setDoor('open'), 250);
    later(() => { setAway(false); setPose('emerge'); }, 600);
    later(() => {
      setPose(rest);
      act('wave');
      if (line) say(line, 4000);
    }, 600 + POSE_MS.emerge);
    later(() => setDoor('shut'), 1600);
    later(() => { setDoor('hidden'); busyRef.current = false; }, 2200);
  };

  // Out through the door: stroll home (it's right beside the door), open it,
  // step through, close it. `then` runs once he's gone.
  const exitThroughDoor = (then, line) => {
    clearTimers();
    busyRef.current = true;
    setBubble(false);
    setExtra(null);
    setThought(line || null);
    setDoor('shut');
    later(() => setDoor('open'), 250);
    const stepThrough = () => {
      setFace('right');
      setPose('exit');
      later(() => { setAway(true); setThought(null); setDoor('shut'); }, POSE_MS.exit);
      later(() => { setDoor('hidden'); then?.(); }, POSE_MS.exit + 600);
    };
    later(() => walkTo(null, stepThrough), 350);
  };

  // A coffee run: out the door, back a few seconds later holding a mug.
  const coffeeRun = () => {
    exitThroughDoor(() => {
      later(() => {
        withProp('mug', 30000);
        enterThroughDoor(pick(COFFEE_BACK_LINES));
      }, 4500);
    }, pick(COFFEE_LINES));
  };

  // Turned off: leave through the door, then tell the app he's gone. Turned
  // back on before he finished leaving: come right back in.
  const wasLeaving = useRef(leaving);
  useEffect(() => {
    if (leaving) {
      if (reducedMotion()) onGoneRef.current?.();
      else exitThroughDoor(() => onGoneRef.current?.(), pick(BYE_LINES));
    } else if (wasLeaving.current) {
      enterThroughDoor(pick(BACK_LINES));
    }
    wasLeaving.current = leaving;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  // New screen: fresh script, a varied hello, and stroll home if he wandered.
  useEffect(() => {
    const opening = buddyOpening(context, study);
    if (typeof context === 'number') visitedRef.current.add(context);
    // Mid door sequence, or the app just told him something (a new study was
    // created, say): update the script but don't interrupt with a hello.
    if (busyRef.current || Date.now() - lastEventRef.current < 900) {
      setTips(opening);
      setIdx(0);
      return;
    }
    clearTimers();
    setIdx(0);
    setExtra(null);
    setThought(null);
    setMoodOverride(null);
    // On a phone-sized control the bubble would cover the step; start tucked
    // away (unless the study has a problem to flag) and let a tap open it.
    const tiny = !!appEl()?.classList.contains('xnarrow');
    setTips(opening);
    setBubble(!tiny || opening.some(t => t.mood === 'worried'));
    if (tiny) later(() => say('Tap me for tips 👋', 4500), 2400);
    if (firstRef.current) {
      firstRef.current = false;
      if (reducedMotion()) { setAway(false); return; }
      enterThroughDoor();
      return;
    }
    // Visited all eight steps in one sitting: an achievement.
    if (visitedRef.current.size === 8 && !tourDoneRef.current) {
      tourDoneRef.current = true;
      act('celebrate', { mood: 'excited' });
      burst();
      setBubble(true);
      setExtra({ say: TOUR_DONE_LINE, kind: 'reaction' });
      return;
    }
    const hello = () => act(pick(['wave', 'wave', 'jump', 'flip', 'spin', 'thumbs']));
    if (x != null || y != null) walkTo(null, hello); else hello();
    // study is read only on context change; live changes go through the
    // reaction effect below so he doesn't re-introduce himself per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, study?.id]);

  // React to the study's numbers as they change (debounced past typing bursts).
  const metricsIdRef = useRef(study?.id);
  useEffect(() => {
    // A different study isn't a change to react to — just a new baseline.
    if (study?.id !== metricsIdRef.current) {
      metricsIdRef.current = study?.id;
      prevMetrics.current = buddyMetrics(study);
      return undefined;
    }
    const t = setTimeout(() => {
      const next = buddyMetrics(study);
      const r = buddyReaction(prevMetrics.current, next);
      prevMetrics.current = next;
      if (!r || busyRef.current || Date.now() - lastReact.current < REACT_COOLDOWN || dragging) return;
      lastReact.current = Date.now();
      if (poseRef.current === 'sleep') setPose(rest);
      act(r.pose, { mood: r.mood, ms: POSE_MS[r.pose] });
      if (r.pose === 'celebrate') burst();
      if (bubble) setExtra({ say: r.say, kind: 'reaction' }); else say(r.say);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study]);

  // The app tells him what just happened (undo, export, delete…).
  useEffect(() => onBuddyEvent((ev) => {
    const spec = BUDDY_EVENTS[ev.type];
    if (!spec || busyRef.current) return;
    lastActive.current = Date.now();
    lastEventRef.current = Date.now();
    lastReact.current = Date.now();
    if (poseRef.current === 'sleep') setPose(rest);
    act(spec.pose, { mood: spec.mood });
    if (spec.pose === 'celebrate') burst();
    if (ev.type === 'export') { setPlane(Date.now()); later(() => setPlane(null), 1800); }
    const line = pick(spec.lines);
    if (bubbleRef.current) setExtra({ say: line, kind: 'reaction' }); else say(line, 4500);
  }), [act, burst, later, rest, say, setPose]);

  // Typing in the app: now and then he takes notes on it.
  useEffect(() => {
    const app = appEl();
    if (!app) return undefined;
    let last = 0;
    const onInput = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      lastActive.current = Date.now();
      if (busyRef.current || !RESTING.has(poseRef.current) || Date.now() - last < 9000 || Math.random() < 0.5) return;
      last = Date.now();
      act('scribble');
      if (!bubbleRef.current && Math.random() < 0.45) say(pick(TYPING_LINES), 2600);
    };
    app.addEventListener('input', onInput, true);
    return () => app.removeEventListener('input', onInput, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, say]);

  // ── Small activities ─────────────────────────────────────────────────────
  const aside = (lines, chance = 0.6, ms = 3200) => {
    if (!bubbleRef.current && Math.random() < chance) say(pick(lines), ms);
  };
  const atHome = () => !rootRef.current || rootRef.current.classList.contains('home');

  const water = () => {
    if (!plant || !atHome()) return act('look');
    withProp('can', POSE_MS.water + 300);
    setFace('left');
    act('water');
    later(() => setPlantPerk(Date.now()), 900);
    aside(WATER_LINES, 0.45);
  };
  const phoneCall = () => {
    const call = pick(PHONE_CALLS);
    const ms = 2200 * call.length + 600;
    withProp('phone', ms);
    act('phone', { ms });
    if (!bubbleRef.current) call.forEach((line, i) => later(() => say(line, 2000), 300 + i * 2200));
  };
  const sweep = () => { withProp('broom', POSE_MS.sweep + 200); act('sweep'); aside(SWEEP_LINES, 0.4); };
  const read = () => { withProp('book', POSE_MS.read + 200); act('read'); aside(READ_LINES, 0.4, 3600); };
  const lean = () => {
    if (!atHome()) return act('tap');
    setFace('left');
    act('lean');
    aside(LEAN_LINES, 0.35);
  };

  // Climb up onto a card and sit on its top edge for a while, legs dangling.
  const perch = () => {
    const m = metrics();
    const app = appEl();
    if (!m || !app || app.classList.contains('xnarrow')) return act('look');
    const cards = [...app.querySelectorAll('.ws-sc .card, .kpi, .study-card, .start-card')]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 160 && r.top > m.rect.top + 200 && r.top < m.rect.bottom - 200 && r.right < m.rect.right - 20);
    if (!cards.length) return act('look');
    const r = pick(cards);
    const left = (r.left - m.rect.left) / m.scale + 20 + Math.random() * Math.max(0, r.width / m.scale - 110);
    const edge = (m.rect.bottom - r.top) / m.scale;   // the card's top edge, from the app's bottom
    walkTo(left, () => {
      perchRef.current = true;
      setFace(Math.random() < 0.5 ? 'left' : 'right');
      setPose('perch');
      aside(PERCH_LINES, 0.6, 3600);
      later(() => { if (perchRef.current) { perchRef.current = false; setPose(rest); walkTo(null); } }, 9000 + Math.random() * 6000);
    }, edge - 6);
  };
  // A card he's sitting on can scroll away under him: hop down and go home.
  useEffect(() => {
    const app = appEl();
    if (!app) return undefined;
    const onScroll = (e) => {
      if (!perchRef.current || rootRef.current?.contains(e.target)) return;
      perchRef.current = false;
      setPose(rest);
      walkTo(null);
    };
    app.addEventListener('scroll', onScroll, true);
    return () => app.removeEventListener('scroll', onScroll, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest]);

  // Back from another tab or window after a while: a small wave.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 60_000 && !busyRef.current) {
        lastActive.current = Date.now();
        if (poseRef.current === 'sleep') setPose(rest);
        act('wave');
        aside(WELCOME_BACK_LINES, 0.8, 3000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, rest]);

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
      if (RESTING.has(poseRef.current) && !drag.current && !busyRef.current && Date.now() - lastActive.current > SLEEP_AFTER) {
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
        if (RESTING.has(poseRef.current) && !drag.current && !busyRef.current) {
          const what = pick(IDLES);
          const tiny = !!appEl()?.classList.contains('xnarrow');
          const away = !atHome();
          if (what === 'coffee') {
            // Only when nobody's mid-conversation with him, and not on a phone.
            if (!bubble && !tiny && !reducedMotion() && !away) coffeeRun();
          } else if (what === 'perch') {
            if (!bubble && !reducedMotion() && !away) perch();
          } else if (what === 'water') water();
          else if (what === 'phone') phoneCall();
          else if (what === 'sweep') sweep();
          else if (what === 'read') read();
          else if (what === 'lean') lean();
          else {
            act(what);
            const aside = what === 'meditate' ? MEDITATE_LINES : what === 'watch' ? WATCH_LINES : IDLE_QUIPS;
            if (!bubble && Math.random() < (aside === IDLE_QUIPS ? 0.4 : 0.7)) say(pick(aside), 3600);
          }
        }
        loop();
      }, 9000 + Math.random() * 8000);
    };
    loop();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const m = metrics();
      if (!m) return;
      const r = el.getBoundingClientRect();
      const targetScreenX = r.left + Math.min(r.width, 260) / 2;
      // Stand just under the target if there's room, else perch on top of it.
      const myH = rootRef.current?.offsetHeight || 104;
      const tBottom = (m.rect.bottom - r.bottom) / m.scale;   // CSS px from app bottom
      const tTop = (m.rect.bottom - r.top) / m.scale;
      const underY = tBottom - myH - 6;
      const destY = underY > 60 ? underY : Math.min(m.maxY, tTop - 6);
      walkTo((targetScreenX - m.rect.left) / m.scale - W / 2 + 30, () => {
        const me = rootRef.current?.getBoundingClientRect();
        if (me) setFace(targetScreenX < me.left + me.width / 2 ? 'left' : 'right');
        act('point', { mood: 'excited', ms: 3300 });
        clearSpot();
        void el.offsetWidth; // restart the pulse if it's already running
        el.classList.add('buddy-spot');
        spotRef.current = el;
        later(clearSpot, 3300);
      }, destY);
    }, 380);
  };

  const poke = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (busyRef.current) return;
    perchRef.current = false;
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
    if (e.button !== 0 || busyRef.current) return;
    const m = metrics();
    const me = rootRef.current;
    if (!m || !me) return;
    const r = me.getBoundingClientRect();
    drag.current = {
      sx: e.clientX, sy: e.clientY, scale: m.scale, moved: false, lastX: e.clientX,
      left: (r.left - m.rect.left) / m.scale, max: m.max,
      bottom: (m.rect.bottom - r.bottom) / m.scale, maxY: m.maxY,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.scale;
    const dy = (e.clientY - d.sy) / d.scale;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) { d.moved = true; setDragging(true); setPose('dangle'); setBubble(false); }
    setFace(e.clientX < d.lastX ? 'left' : e.clientX > d.lastX ? 'right' : face);
    d.lastX = e.clientX;
    setX(Math.max(MARGIN, Math.min(d.max, d.left + dx)));
    setY(Math.max(MARGIN, Math.min(d.maxY, d.bottom - dy)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    // Swallow the click that follows this pointerup — and only that one: if
    // the pointer was released off the figure no click comes, so clear it.
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    setDragging(false);
    act('land', { mood: 'surprised' });
    say(pick(DRAG_LINES), 2600);
  };

  const onPointerCancel = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) { setDragging(false); setPose(rest); }
  };

  const lastShy = useRef(0);
  const onHover = () => {
    if (busyRef.current || !RESTING.has(poseRef.current) || Date.now() - lastShy.current < 7000) return;
    lastShy.current = Date.now();
    act('shy', { mood: 'happy' });
    if (!bubbleRef.current && Math.random() < 0.5) say(pick(HOVER_LINES), 2200);
  };

  const goHome = () => { perchRef.current = false; setBubble(false); setExtra(null); if (x != null || y != null) walkTo(null); };

  const text = extra?.say || tip?.say;
  const [typed, finishTyping, typedAll] = useTypewriter(bubble ? text : null);

  // Don't park a speech bubble over the user's work forever: once he's done
  // talking and nobody is hovering it, tuck it away. Clicking him brings it back.
  const hovering = useRef(false);
  // The bubble can vanish from under the pointer (× or Hide) with no
  // mouseleave; don't let that leave auto-tuck disabled for good.
  useEffect(() => { if (!bubble) hovering.current = false; }, [bubble]);
  useEffect(() => {
    if (!bubble || !typedAll) return undefined;
    const t = setTimeout(() => { if (!hovering.current) setBubble(false); }, 16000);
    return () => clearTimeout(t);
  }, [bubble, typedAll, text]);
  const appWidth = metrics()?.width || 0;
  const onLeftHalf = x != null && x < appWidth / 2;
  // High up the screen there's no room for the bubble above him: put it below.
  const m0 = metrics();
  const bubbleBelow = y != null && m0 && m0.height - y - (rootRef.current?.offsetHeight || 104) < 240;

  const expr = {
    sleep: 'sleepy', dizzy: 'dizzy', wake: 'surprised', land: 'surprised', whistle: 'whistle',
    celebrate: 'excited', dance: 'excited', flip: 'excited', spin: 'excited', moonwalk: 'excited', dangle: 'surprised',
    worry: 'worried', think: 'neutral', sad: 'sad', meditate: 'calm', rewind: 'excited', throw: 'excited',
    scribble: 'neutral', watch: 'neutral', exit: 'happy', emerge: 'happy',
    phone: 'neutral', read: 'neutral', lean: 'calm', water: 'happy', sweep: 'neutral', perch: 'happy',
  }[pose] || moodOverride || tip?.mood || 'happy';

  const raised = context === 'dashboard' ? '' : ' raised';
  return (
    <>
    {plant > 0 && (
      <div className={`buddy-plant no-print${raised}${plantPerk ? ' perk' : ''}`} key={plantPerk} aria-hidden="true">
        <Plant stage={plant} />
      </div>
    )}
    {balloonAway && (
      <svg className="buddy-balloon-away no-print" key={balloonAway.key} style={{ left: balloonAway.left, bottom: balloonAway.bottom }} viewBox="0 0 20 44" aria-hidden="true">
        <path d="M10 20 q-3 10 1 22" fill="none" stroke="#475569" strokeWidth="1" />
        <ellipse cx="10" cy="10" rx="8" ry="10" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
      </svg>
    )}
    {ladder && (
      <div
        key={ladder.key}
        className={`buddy-ladder no-print ladder-${ladder.state}`}
        style={{ left: ladder.left, bottom: ladder.bottom, height: ladder.height }}
        aria-hidden="true"
      />
    )}
    <div className={`buddy-door no-print door-${door}${raised}`} aria-hidden="true">
      <div className="door-frame">
        <div className="door-inside" />
        <div className="door-panel"><span className="door-window">💧</span><span className="door-knob" /></div>
      </div>
    </div>
    <div
      ref={rootRef}
      className={`buddy no-print pose-${pose} face-${face} expr-${expr} prop-${prop}${x == null ? ' home' : ''}${raised}${dragging ? ' dragging' : ''}${away ? ' away' : ''}`}
      style={x == null && y == null ? undefined : { ...(x == null ? {} : { left: x }), ...(y == null ? {} : { bottom: y }) }}
    >
      {bubble && text && (
        <div
          className={'buddy-bubble' + (onLeftHalf ? ' from-left' : '') + (bubbleBelow ? ' below' : '') + (extra ? ' ' + extra.kind : '')}
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
        <div className={'buddy-thought' + (onLeftHalf ? ' from-left' : '') + (bubbleBelow ? ' below' : '')} aria-live="polite">{thought}</div>
      )}
      {confetti && (
        <div className="buddy-confetti" key={confetti.key} aria-hidden="true">
          {confetti.bits.map((b, i) => (
            <i key={i} style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, '--r': `${b.r}deg`, '--c': b.c, animationDelay: `${b.d}ms` }} />
          ))}
        </div>
      )}
      {plane && (
        <svg className="buddy-plane" key={plane} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 11.5 L22 3 L14.5 21 L11 13.5 Z" />
          <path d="M11 13.5 L22 3" />
        </svg>
      )}
      <button
        className="buddy-fig"
        onClick={poke}
        onMouseEnter={onHover}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={() => { if (!bubble) { setBubble(true); setExtra(null); } }}
        aria-label="Drip, the stick-figure guide. Click for a trick and a joke; drag to move him."
        title="Click me! (or drag me)"
      >
        <DripFigure prop={prop} expr={expr} badge={badge} />
      </button>
    </div>
    </>
  );
}
