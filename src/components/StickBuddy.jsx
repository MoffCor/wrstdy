import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUDDY_JOKES, BUDDY_PROPS, IDLE_QUIPS, WAKE_LINES, DRAG_LINES, DIZZY_LINES,
  BUDDY_EVENTS, BYE_LINES, SHOWREEL_OPENERS, SHOWREEL_CLOSERS, shuffled, BACK_LINES, COFFEE_LINES, COFFEE_BACK_LINES, TYPING_LINES,
  HOVER_LINES, MEDITATE_LINES, WATCH_LINES, TOUR_DONE_LINE,
  FLY_LINES, MOVE_LINES, LANDING_LINES, SPLAT_LINES, ACTIVITY_LINES, FISH_CATCHES, PRO_TIPS,
  whatsNext, explainStep, glossaryFor,
  PHONE_CALLS, WATER_LINES, SWEEP_LINES, READ_LINES, LEAN_LINES, PERCH_LINES, WELCOME_BACK_LINES,
  plantStage,
  buddyOpening, buddyMetrics, buddyReaction, pick, seasonal,
} from '../lib/buddy.js';
import { onBuddyEvent, buddyEvent } from '../lib/buddyBus.js';
import { DripGear } from './DripGear.jsx';
import { getSetting, setSetting } from '../platform/host.js';

const W = 64;            // rendered figure width (px)
const PLANT_SETTING = 'wrs-buddy-plant';
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
  water: 2800, sweep: 3200, read: 4600, lean: 6500, clap: 800, getup: 900,
  trip: 2600, slip: 3000, sneeze: 2200, hiccup: 3200, yoyo: 3200, juggle: 4200, jumprope: 3600,
  hula: 3600, selfie: 2400, magic: 2600, stretch: 1800, fish: 6500,
};
const TRICKS = ['jump', 'flip', 'spin', 'dance', 'moonwalk'];
// What he gets up to between conversations, every few seconds. A quarter of
// the time it's something small; otherwise one of the bits below, picking
// whichever he's done least so all of them come round early. Outings (a
// coffee run, climbing onto a card, a wander) only when his bubble is closed.
const SMALL_IDLES = ['look', 'tap', 'fidget', 'think', 'whistle', 'watch', 'kick', 'stretch'];
const BIG_IDLES = [
  'water', 'read', 'sweep', 'phone', 'lean', 'meditate', 'sit', 'trip', 'slip', 'sneeze', 'hiccup',
  'yoyo', 'juggle', 'jumprope', 'hula', 'selfie', 'magic', 'plane', 'protip',
];
const OUTINGS = ['perch', 'coffee', 'wander'];
const RESTING = new Set(['idle', 'juggle']);
// Poses that keep him sitting on a card's top edge.
const PERCHED = new Set(['perch', 'fish', 'reel']);

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
    case 'juggle': case 'wand': return null; // drawn by the figure itself
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
        {/* Things he stands on or swings, which move with his whole body. */}
        <g className="b-skate"><rect x="8" y="96" width="48" height="3" rx="1.5" /><circle cx="15" cy="101" r="2.2" /><circle cx="49" cy="101" r="2.2" /></g>
        <g className="b-pogo"><path d="M40 46 V108" className="pg-pole" /><path d="M35 46 h10" className="pg-peg" /><path d="M33 93 h14" className="pg-peg" /><path d="M40 98 l-3 2 l6 2 l-6 2 l3 2" className="pg-spring" /></g>
        <g className="b-jrope"><path d="M18 60 Q32 -24 46 60" /></g>
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
          <g className="b-jet">
            <rect x="22" y="40" width="8" height="15" rx="2" className="jt-pack" />
            <path d="M23 55 L26 70 L29 55z" className="jt-flame" />
          </g>
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
              <g className="b-yoyo"><line x1="46" y1="60" x2="46" y2="84" className="yo-string" /><circle cx="46" cy="86" r="3" className="yo-drop" /></g>
              <g className="b-rod">
                <line x1="46" y1="60" x2="72" y2="30" className="rod-pole" />
                <line x1="72" y1="30" x2="72" y2="128" className="rod-line" />
                <circle cx="72" cy="122" r="2.4" className="rod-bobber" />
                <g className="rod-catch">
                  <path className="c-fish" d="M66 132 q6 -5 12 0 q-6 5 -12 0z M78 132 l4 -3 v6z" />
                  <text className="c-dollar" x="68" y="136">$</text>
                  <path className="c-boot" d="M67 126 h6 v6 h5 v4 h-11z" />
                  <path className="c-drop" d="M72 126 c0 0 -4 5 -4 7.5 a4 4 0 0 0 8 0 c0 -2.5 -4 -7.5 -4 -7.5z" />
                </g>
              </g>
              <g className="b-wand"><line x1="46" y1="60" x2="58" y2="44" className="wand-stick" /><circle cx="58" cy="44" r="1.6" className="wand-tip" /></g>
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
          {/* Juggling drops: shown whenever he juggles, not only on Step 6. */}
          <g className="b-juggle">
            {[0, 1, 2].map(i => <path key={i} className={'b-jdrop j' + i} d="M32 -21 c0 0 -3 4 -3 6 a3 3 0 0 0 6 0 c0 -2 -3 -6 -3 -6z" />)}
          </g>
          <ellipse className="b-hoop" cx="32" cy="66" rx="17" ry="4.5" />
          <g className="b-chute">
            <path d="M6 -2 Q32 -34 58 -2 Q51 -7 45 -2 Q38 -8 32 -2 Q26 -8 19 -2 Q13 -7 6 -2z" className="ch-canopy" />
            <path d="M8 -2 L17 25 M20 -4 L17 25 M56 -2 L47 25 M44 -4 L47 25" className="ch-lines" />
          </g>
        </g>
      </g>
        {/* Ground effects: in the flip group (so "behind him" follows his
            direction) but outside b-all (so they stay on the ground). */}
        <g className="b-elev"><rect x="6" y="97" width="52" height="4" rx="1" className="el-floor" /><path d="M8 97 V70 M56 97 V70" className="el-rail" /></g>
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
        {/* Beside his face: moved across when he faces left. */}
        <g className="b-side">
          <text className="b-achoo" x="40" y="16">achoo!</text>
          <text className="b-hic" x="44" y="18">hic</text>
          <circle className="b-flash" cx="54" cy="18" r="9" />
        </g>
        <g className="b-magic"><path className="mg-drop" d="M32 2 c0 0 -4 5 -4 7.5 a4 4 0 0 0 8 0 c0 -2.5 -4 -7.5 -4 -7.5z" /><text x="18" y="4">✦</text><text x="42" y="0">✧</text><text x="26" y="-6">✦</text></g>
        <text className="b-om" x="38" y="16">ommm</text>
        <circle className="b-pebble" cx="50" cy="96" r="2.2" />
        <g className="b-cloud" transform="translate(0 -9)">
          <path d="M18 2 a5 5 0 0 1 8 -4 a6 6 0 0 1 11 1 a4.5 4.5 0 0 1 2 8.5 h-19 a3.8 3.8 0 0 1 -2 -5.5z" />
          <line className="rd1" x1="23" y1="9" x2="22" y2="13" />
          <line className="rd2" x1="29" y1="9" x2="28" y2="13" />
          <line className="rd3" x1="35" y1="9" x2="34" y2="13" />
        </g>
        <g className="b-stars-at"><g className="b-stars"><text x="20" y="6">✦</text><text x="38" y="2">✧</text><text x="29" y="-2">✦</text></g></g>
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
  const [gear, setGear] = useState(null);         // whatever he's propped up to get around (see DripGear)
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
  const [catchItem, setCatchItem] = useState(null); // what's on the end of the fishing line
  const perchRef = useRef(false);
  const wanderRef = useRef(false);   // strolled off on his own: he'll come back
  const reelRef = useRef(false);     // mid "What can you do?" showreel
  const gearRef = useRef(null);
  gearRef.current = gear;
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
  // Anything that interrupts him also packs away whatever he'd set up.
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; clearSpot(); setGear(null); setCatchItem(null); };
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
  const target = extra ? extra.target : tip?.target;

  // Only offer "Show me" when the target is on screen right now — checked
  // after each render because step content mounts alongside him.
  const [hasTarget, setHasTarget] = useState(false);
  useEffect(() => { setHasTarget(!!findTarget(target)); });

  // Getting somewhere. A trip that changes height has two legs: going up, he
  // crosses first and then climbs; coming down, he gets down first and then
  // crosses. Each leg picks a way of travelling, preferring whichever he has
  // used least, so every one of them turns up early instead of the same two
  // on repeat. `nextX` null means home; `nextY` is a CSS bottom offset, null
  // meaning the floor.
  const usage = useRef({});
  const choose = useCallback((list) => {
    const u = usage.current;
    const least = Math.min(...list.map(k => u[k] || 0));
    const k = pick(list.filter(m => (u[m] || 0) === least));
    u[k] = (u[k] || 0) + 1;
    return k;
  }, []);
  const moveAside = (mode) => { if (Math.random() < 0.45) say(pick(MOVE_LINES[mode] || FLY_LINES), 2400); };

  const walkTo = useCallback((nextX, then, nextY = null) => {
    const m = metrics();
    const me = rootRef.current;
    if (!m || !me) return;
    const r = me.getBoundingClientRect();
    const cur = (r.left - m.rect.left) / m.scale;
    const curY = (m.rect.bottom - r.bottom) / m.scale;
    const myH = me.offsetHeight || 104;
    const floor = me.classList.contains('raised') ? 58 : 10;
    const clampX = (v) => Math.max(MARGIN, Math.min(m.max, v));
    const dest = nextX == null ? m.max : clampX(nextX);
    const destY = nextY == null ? floor : Math.max(MARGIN, Math.min(m.maxY, nextY));
    const home = () => { if (nextX == null) { setX(null); setFace('left'); } if (nextY == null) setY(null); };
    if (Math.hypot(dest - cur, destY - curY) < 4) { setX(nextX == null ? null : dest); setY(nextY == null ? null : destY); then?.(); return; }

    setX(cur); // pin the current spot so the move animates
    setY(curY);
    const timing = (ms, ease = 'linear') => { me.style.setProperty('--walk-ms', `${ms}ms`); me.style.setProperty('--walk-ease', ease); };
    const plain = reducedMotion();
    const dy = destY - curY;
    const up = dy > 0;
    const vMode = Math.abs(dy) <= 30 ? null
      : plain ? 'fly'
        : choose(up ? ['ladder', 'balloon', 'stairs', 'trampoline', 'rope', 'jetpack', 'elevator', 'pogo', 'fly']
          : ['umbrella', 'parachute', 'slide', 'pole', 'jump', 'ladder', 'rope']);
    const dirToDest = dest >= cur ? 1 : -1;
    // Diagonal ways of travelling cover some of the horizontal distance.
    const stairsRun = vMode === 'stairs' ? Math.min(Math.abs(dy) * 0.9, 220) : 0;
    const slideRun = vMode === 'slide' ? Math.min(Math.abs(dy) * 0.9, 220) : 0;

    // ── Across ──
    const horizontal = (fromX, toX, after) => {
      const dist = Math.abs(toX - fromX);
      if (dist < 4) { setX(toX); after(); return; }
      const dir = toX >= fromX ? 1 : -1;
      const mode = plain ? 'walk'
        : dist > 360 ? choose(['run', 'skate', 'cartwheel'])
          : Math.random() < 0.22 ? choose(['tiptoe', 'moonwalk']) : 'walk';
      const speed = { run: 1.7, skate: 1.4, cartwheel: 2.2, tiptoe: 5, moonwalk: 4.2, walk: 3 }[mode];
      const ms = Math.round(Math.min(mode === 'tiptoe' ? 3200 : 2600, Math.max(450, dist * speed)));
      timing(ms, mode === 'skate' ? 'cubic-bezier(.4, 0, .3, 1)' : 'linear');
      // Moonwalking faces the way he came.
      setFace(mode === 'moonwalk' ? (dir > 0 ? 'left' : 'right') : (dir > 0 ? 'right' : 'left'));
      if (mode !== 'walk' && mode !== 'run') moveAside(mode);
      requestAnimationFrame(() => {
        setPose(mode);
        setX(toX);
        later(after, ms);
      });
    };

    // ── Up or down ──
    const vertical = (fromX, toX, after) => {
      if (!vMode) { setY(destY); after(); return; }
      const h = Math.abs(dy);
      const stop = (cb, ms) => later(cb, ms);
      moveAside(vMode);
      switch (vMode) {
        case 'ladder': {
          setGear({ type: 'ladder', key: Date.now(), left: fromX + 15, bottom: Math.min(curY, destY), height: h + myH * 0.9 });
          setFace('right');
          const ms = Math.round(Math.min(2800, Math.max(800, h * 7)));
          stop(() => { timing(ms); setPose('climb'); requestAnimationFrame(() => setY(destY)); }, 450);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), 450 + ms + 150);
          stop(() => setGear(null), 450 + ms + 600);
          stop(() => { if (up) { setPose('clap'); stop(after, POSE_MS.clap); } else after(); }, 450 + ms);
          break;
        }
        case 'stairs': {
          setGear({ type: 'stairs', key: Date.now(), x0: fromX, y0: curY, x1: toX, y1: destY });
          const n = Math.max(3, Math.min(14, Math.round(h / 16)));
          const ms = Math.round(Math.min(3000, Math.max(900, Math.hypot(toX - fromX, h) * 5)));
          setFace(toX >= fromX ? 'right' : 'left');
          stop(() => { timing(ms); setPose('walk'); requestAnimationFrame(() => { setX(toX); setY(destY); }); }, n * 45 + 200);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), n * 45 + 200 + ms + 200);
          stop(() => setGear(null), n * 45 + 200 + ms + 700);
          stop(after, n * 45 + 200 + ms);
          break;
        }
        case 'trampoline': {
          setGear({ type: 'trampoline', key: Date.now(), left: fromX + 2, bottom: curY - 5 });
          setPose('bounce');
          const ms = Math.round(Math.min(1100, Math.max(600, h * 2.2)));
          stop(() => { timing(ms, 'cubic-bezier(.2, .8, .3, 1)'); setPose('tuck'); requestAnimationFrame(() => setY(destY)); }, 1000);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), 1300);
          stop(() => setGear(null), 1800);
          stop(() => { setPose('land'); stop(after, POSE_MS.land); }, 1000 + ms);
          break;
        }
        case 'rope': {
          // Hook thrown to the top; he climbs (or lowers himself) hand over hand.
          setGear({ type: 'rope', key: Date.now(), left: fromX + 44, bottom: Math.min(curY, destY) + 40, height: h + 70, dir: up ? 'up' : 'down' });
          setFace('right');
          const ms = Math.round(Math.min(2800, Math.max(800, h * 6)));
          stop(() => { timing(ms); setPose('climb'); requestAnimationFrame(() => setY(destY)); }, up ? 500 : 300);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), (up ? 500 : 300) + ms + 100);
          stop(() => setGear(null), (up ? 500 : 300) + ms + 500);
          stop(after, (up ? 500 : 300) + ms);
          break;
        }
        case 'jetpack': {
          const ms = Math.round(Math.min(2000, Math.max(800, h * 3.5)));
          setPose('jetpack');
          stop(() => { timing(ms, 'cubic-bezier(.45, 0, .55, 1)'); requestAnimationFrame(() => setY(destY)); }, 350);
          stop(() => { setPose('land'); stop(after, POSE_MS.land); }, 350 + ms);
          break;
        }
        case 'elevator': {
          const ms = Math.round(Math.min(2600, Math.max(900, h * 5)));
          setPose('elevator');
          stop(() => { timing(ms, 'cubic-bezier(.45, 0, .55, 1)'); requestAnimationFrame(() => setY(destY)); }, 300);
          stop(() => { say('Ding.', 1400); after(); }, 300 + ms);
          break;
        }
        case 'pogo': {
          const hops = Math.max(2, Math.min(5, Math.round(h / 60)));
          setPose('pogo');
          for (let k = 1; k <= hops; k++) {
            stop(() => { timing(380, 'cubic-bezier(.2, .8, .3, 1)'); setY(curY + (dy * k) / hops); }, 200 + (k - 1) * 480);
          }
          stop(after, 200 + hops * 480);
          break;
        }
        case 'balloon':
        case 'umbrella':
        case 'parachute': {
          const ms = Math.round(Math.min(2800, Math.max(900, h * (vMode === 'balloon' ? 3.4 : 4))));
          setPose(vMode);
          stop(() => { timing(ms, vMode === 'balloon' ? 'cubic-bezier(.4, 0, .6, 1)' : 'cubic-bezier(.2, .4, .4, 1)'); requestAnimationFrame(() => setY(destY)); }, 250);
          stop(() => {
            if (vMode === 'balloon') {
              // He lets go at the top; the balloon carries on without him.
              setBalloonAway({ key: Date.now(), left: toX + 40, bottom: destY + 70 });
              later(() => setBalloonAway(null), 3400);
            }
            if (vMode === 'parachute') { setPose('land'); stop(after, POSE_MS.land); } else after();
          }, 250 + ms);
          break;
        }
        case 'slide': {
          setGear({ type: 'slide', key: Date.now(), x0: fromX, y0: curY, x1: toX, y1: destY });
          setFace(toX >= fromX ? 'right' : 'left');
          const ms = Math.round(Math.min(1800, Math.max(700, Math.hypot(toX - fromX, h) * 2.2)));
          stop(() => { timing(ms, 'cubic-bezier(.5, 0, .9, .6)'); setPose('slide'); requestAnimationFrame(() => { setX(toX); setY(destY); }); }, 450);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), 450 + ms + 400);
          stop(() => setGear(null), 450 + ms + 900);
          stop(() => { setPose('land'); stop(after, POSE_MS.land); }, 450 + ms);
          break;
        }
        case 'pole': {
          setGear({ type: 'pole', key: Date.now(), left: fromX + 30, bottom: destY + 4, height: h + 80 });
          setFace('right');
          const ms = Math.round(Math.min(1100, Math.max(450, h * 1.8)));
          stop(() => { timing(ms, 'cubic-bezier(.5, 0, 1, 1)'); setPose('pole'); requestAnimationFrame(() => setY(destY)); }, 400);
          stop(() => setGear(g => (g ? { ...g, state: 'fold' } : g)), 400 + ms + 300);
          stop(() => setGear(null), 400 + ms + 800);
          stop(() => { setPose('land'); stop(after, POSE_MS.land); }, 400 + ms);
          break;
        }
        case 'jump': {
          // Straight down. Sometimes he sticks the landing; sometimes he doesn't.
          const ms = Math.round(Math.min(900, Math.max(380, Math.sqrt(h) * 40)));
          setPose('crouch');
          stop(() => { timing(ms, 'cubic-bezier(.55, 0, 1, .45)'); setPose('fall'); requestAnimationFrame(() => setY(destY)); }, 350);
          stop(() => {
            if (Math.random() < 0.4) {
              setPose('splat');
              stop(() => setPose('getup'), 1100);
              stop(() => { say(pick(SPLAT_LINES), 2200); setPose('clap'); stop(after, POSE_MS.clap); }, 1100 + POSE_MS.getup);
            } else {
              setPose('land');
              if (Math.random() < 0.5) say(pick(LANDING_LINES), 1800);
              stop(after, POSE_MS.land + 150);
            }
          }, 350 + ms);
          break;
        }
        default: { // fly
          const ms = Math.round(Math.min(2400, Math.max(700, h * 3.2)));
          timing(ms, 'cubic-bezier(.3, .1, .3, 1)');
          setPose('fly');
          requestAnimationFrame(() => setY(destY));
          stop(after, ms);
        }
      }
    };

    const done = () => { setPose(rest); home(); then?.(); };
    if (up || !vMode) {
      const climbFrom = vMode === 'stairs' ? clampX(dest - dirToDest * stairsRun) : dest;
      horizontal(cur, climbFrom, () => vertical(climbFrom, dest, done));
    } else {
      const landAt = vMode === 'slide' ? clampX(cur + dirToDest * slideRun) : cur;
      vertical(cur, landAt, () => horizontal(landAt, dest, done));
    }
  }, [later, rest, setPose, say, choose]);

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

  // Landing in a field he has something to say about: a one-line definition,
  // once per term per session.
  useEffect(() => {
    const app = appEl();
    if (!app) return undefined;
    const seen = new Set();
    let last = 0;
    const onFocus = (e) => {
      const t = e.target;
      if (!t?.matches?.('input, select, textarea') || rootRef.current?.contains(t) || busyRef.current) return;
      const label = t.closest('.fld')?.querySelector('.flb')?.textContent || t.getAttribute('aria-label') || '';
      const def = glossaryFor(label);
      if (!def || seen.has(def) || Date.now() - last < 8000) return;
      seen.add(def);
      last = Date.now();
      lastActive.current = Date.now();
      if (poseRef.current === 'sleep') setPose(rest);
      if (RESTING.has(poseRef.current)) act('think');
      if (bubbleRef.current) setExtra({ say: def, kind: 'help' }); else say(def, 7000);
    };
    app.addEventListener('focusin', onFocus);
    return () => app.removeEventListener('focusin', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, say, rest]);

  // ── Small activities ─────────────────────────────────────────────────────
  // Each returns roughly how long it takes, so the showreel can chain them.
  const aside = (lines, chance = 0.6, ms = 3200) => {
    if (!bubbleRef.current && Math.random() < chance) say(pick(lines), ms);
  };
  const atHome = () => !rootRef.current || rootRef.current.classList.contains('home');
  // Where he is now, in the app's CSS pixels.
  const here = () => {
    const m = metrics();
    const r = rootRef.current?.getBoundingClientRect();
    if (!m || !r) return null;
    return { x: (r.left - m.rect.left) / m.scale, y: (m.rect.bottom - r.bottom) / m.scale };
  };
  const facingLeft = () => !!rootRef.current?.classList.contains('face-left');

  const water = () => {
    if (!plant || !atHome()) { act('look'); return POSE_MS.look; }
    withProp('can', POSE_MS.water + 300);
    setFace('left');
    act('water');
    later(() => setPlantPerk(Date.now()), 900);
    aside(WATER_LINES, 0.45);
    return POSE_MS.water;
  };
  const phoneCall = () => {
    const call = pick(PHONE_CALLS);
    const ms = 2200 * call.length + 600;
    withProp('phone', ms);
    act('phone', { ms });
    if (!bubbleRef.current) call.forEach((line, i) => later(() => say(line, 2000), 300 + i * 2200));
    return ms;
  };
  const sweep = () => { withProp('broom', POSE_MS.sweep + 200); act('sweep'); aside(SWEEP_LINES, 0.4); return POSE_MS.sweep; };
  const read = () => { withProp('book', POSE_MS.read + 200); act('read'); aside(READ_LINES, 0.4, 3600); return POSE_MS.read; };
  const lean = () => {
    if (!atHome()) { act('tap'); return POSE_MS.tap; }
    setFace('left');
    act('lean');
    aside(LEAN_LINES, 0.35);
    return POSE_MS.lean;
  };
  // Simple bits: a pose, maybe a prop, maybe a line.
  const bit = (name, { mood, prop: p, chance = 0.55, ms } = {}) => {
    const len = ms ?? POSE_MS[name] ?? 2500;
    if (p) withProp(p, len + 200);
    act(name, { mood, ms: len });
    if (ACTIVITY_LINES[name]) aside(ACTIVITY_LINES[name], chance, Math.min(3200, len + 600));
    return len;
  };
  // Slips on a puddle that wasn't there a second ago.
  const slip = () => {
    const h = here();
    if (!h || gearRef.current) return bit('trip', { mood: 'surprised', chance: 0.7 });
    const left = facingLeft();
    setGear({ type: 'puddle', key: Date.now(), left: h.x + (left ? -6 : 26), bottom: h.y + 3 });
    later(() => setPose('slip'), 350);
    later(() => { setPose(cur => (cur === 'slip' ? rest : cur)); }, 350 + POSE_MS.slip);
    later(() => setGear(g => (g?.type === 'puddle' ? { ...g, state: 'fold' } : g)), 350 + POSE_MS.slip - 300);
    later(() => setGear(g => (g?.type === 'puddle' ? null : g)), 350 + POSE_MS.slip + 400);
    later(() => aside(ACTIVITY_LINES.slip, 0.75, 2800), 1500);
    return 350 + POSE_MS.slip;
  };
  const magic = () => {
    const len = bit('magic', { mood: 'excited', prop: 'wand', chance: 0 });
    later(() => aside(ACTIVITY_LINES.magic, 0.7, 2800), 1500);
    return len;
  };
  const selfie = () => bit('selfie', { prop: 'phone', chance: 0.6 });
  const paperPlane = () => {
    act('throw', { mood: 'excited' });
    later(() => { setPlane(Date.now()); later(() => setPlane(null), 1800); }, 350);
    aside(ACTIVITY_LINES.plane, 0.55, 2600);
    return 1800;
  };
  const proTip = () => {
    if (bubbleRef.current) return 0;
    act('think');
    say(pick(PRO_TIPS), 7500);
    return POSE_MS.think;
  };
  const ACTIVITIES = {
    water, phone: phoneCall, sweep, read, lean, slip, magic, selfie, plane: paperPlane, protip: proTip,
    meditate: () => { act('meditate'); aside(MEDITATE_LINES, 0.6); return POSE_MS.meditate; },
    sit: () => { act('sit'); aside(IDLE_QUIPS, 0.4, 3600); return POSE_MS.sit; },
    trip: () => bit('trip', { mood: 'surprised', chance: 0.7 }),
    sneeze: () => bit('sneeze', { chance: 0.6 }),
    hiccup: () => bit('hiccup', { mood: 'surprised', chance: 0.6 }),
    yoyo: () => bit('yoyo'),
    juggle: () => bit('juggle'),
    jumprope: () => bit('jumprope'),
    hula: () => bit('hula'),
    stretch: () => bit('stretch', { chance: 0.3 }),
  };
  const runActivity = (name) => (ACTIVITIES[name] ? ACTIVITIES[name]() : bit(name, { chance: 0 })) || 0;

  // Climb up onto a card and sit on its top edge for a while, legs dangling.
  // Sometimes he gets a fishing rod out.
  const visibleCards = (m) => {
    const app = appEl();
    if (!app) return [];
    // Anything with a solid top edge he can stand on: cards, and the step's
    // guide panel. Not right under the header, and high enough off the floor
    // to be worth the climb.
    return [...app.querySelectorAll('.ws-sc .card, .ws-sc .step-guide, .kpi, .study-card, .start-card')]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 160 && r.top > m.rect.top + 160 && r.top < m.rect.bottom - 120 && r.right < m.rect.right - 20);
  };
  const spotOn = (m, r) => ({
    x: (r.left - m.rect.left) / m.scale + 20 + Math.random() * Math.max(0, r.width / m.scale - 110),
    y: (m.rect.bottom - r.top) / m.scale - 6,  // standing on its top edge
  });
  const fish = () => {
    const c = pick(FISH_CATCHES);
    setPose('fish');
    aside(ACTIVITY_LINES.fish, 0.5, 2400);
    later(() => { if (perchRef.current) { setCatchItem(c.item); setPose('reel'); } }, 4200);
    later(() => { if (perchRef.current && !bubbleRef.current) say(c.say, 3000); }, 4700);
    later(() => { setCatchItem(null); if (perchRef.current) setPose('perch'); }, POSE_MS.fish);
  };
  const perch = () => {
    const m = metrics();
    const app = appEl();
    if (!m || !app || app.classList.contains('xnarrow')) { act('look'); return; }
    const cards = visibleCards(m);
    if (!cards.length) { act('look'); return; }
    const spot = spotOn(m, pick(cards));
    walkTo(spot.x, () => {
      perchRef.current = true;
      setFace(Math.random() < 0.5 ? 'left' : 'right');
      setPose('perch');
      aside(PERCH_LINES, 0.6, 3600);
      if (Math.random() < 0.6) later(() => { if (perchRef.current) fish(); }, 2400);
      later(() => { if (perchRef.current) { perchRef.current = false; setPose(rest); walkTo(null); } }, 10000 + Math.random() * 6000);
    }, spot.y);
  };
  // A stroll: somewhere along the floor, or up onto a card for a look round,
  // then back home.
  const wander = () => {
    const m = metrics();
    const app = appEl();
    if (!m || !app) { act('look'); return; }
    let spot = { x: MARGIN + Math.random() * Math.max(0, m.max - MARGIN), y: null };
    if (!app.classList.contains('xnarrow') && Math.random() < 0.6) {
      const cards = visibleCards(m);
      if (cards.length) spot = spotOn(m, pick(cards));
    }
    wanderRef.current = true;
    walkTo(spot.x, () => {
      act(pick(['look', 'think', 'whistle', 'tap', 'watch']));
      aside(IDLE_QUIPS, 0.35, 3000);
      const comeBack = (tries) => later(() => {
        if (!wanderRef.current) return;
        if (RESTING.has(poseRef.current) && !drag.current) { wanderRef.current = false; walkTo(null); } else if (tries > 0) comeBack(tries - 1);
      }, tries === 4 ? 5500 + Math.random() * 4000 : 2500);
      comeBack(4);
    }, spot.y);
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

  // A little life between conversations, every five to ten seconds.
  useEffect(() => {
    let t;
    const loop = () => {
      t = setTimeout(() => {
        if (RESTING.has(poseRef.current) && !drag.current && !busyRef.current && !reelRef.current && !perchRef.current) {
          const tiny = !!appEl()?.classList.contains('xnarrow');
          const free = !bubbleRef.current && !reducedMotion();
          const r = Math.random();
          let done = false;
          if (r > 0.86 && free) {
            const o = choose(OUTINGS);
            if (o === 'wander') { wander(); done = true; }
            else if (atHome() && o === 'perch' && !tiny) { perch(); done = true; }
            else if (atHome() && o === 'coffee' && !tiny) { coffeeRun(); done = true; }
          }
          if (!done && r > 0.25) done = runActivity(choose(BIG_IDLES)) > 0;
          if (!done) {
            const what = pick(SMALL_IDLES);
            runActivity(what);
            if (Math.random() < 0.35) aside(what === 'watch' ? WATCH_LINES : IDLE_QUIPS, 1, 3600);
          }
        }
        loop();
      }, 5000 + Math.random() * 5000);
    };
    loop();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, say, choose]);

  // "What can you do?": a quick tour of his ways of getting about and a few
  // of his bits, up onto cards and back. Any click on him ends it.
  const showreel = () => {
    // Mid-way through his door: start once he's in.
    if (busyRef.current) { later(showreel, 500); return; }
    clearTimers();
    perchRef.current = false;
    wanderRef.current = false;
    setBubble(false);
    setExtra(null);
    const m = metrics();
    if (!m || reducedMotion()) {
      setBubble(true);
      setExtra({ say: 'Ladders, stairs, a trampoline, a jetpack, a pogo stick, a parachute, a fire pole, a skateboard, juggling, magic, fishing… With motion turned down, you\'ll have to take my word for it.', kind: 'joke' });
      return;
    }
    reelRef.current = true;
    const tiny = !!appEl()?.classList.contains('xnarrow');
    const cards = tiny ? [] : shuffled(visibleCards(m));
    const stop = (i, fx) => (cards[i] ? spotOn(m, cards[i]) : { x: m.width * fx, y: null });
    const bits = shuffled(['juggle', 'magic', 'hula', 'yoyo', 'jumprope', 'selfie', 'sneeze', 'hiccup', 'slip']).slice(0, 3);
    const stops = [stop(0, 0.2), stop(1, 0.55), stop(2, 0.35)];
    const seq = [
      (next) => { act('wave'); say(pick(SHOWREEL_OPENERS), 2600); later(next, 1700); },
      ...stops.flatMap((p, i) => [
        (next) => walkTo(p.x, next, p.y),
        (next) => later(next, runActivity(bits[i]) + 300),
      ]),
      (next) => walkTo(null, next),
      () => {
        reelRef.current = false;
        act('celebrate', { mood: 'excited' });
        burst();
        say(pick(SHOWREEL_CLOSERS), 3400);
      },
    ];
    let i = 0;
    const next = () => { if (reelRef.current) seq[i++]?.(next); };
    next();
  };
  const stopReel = () => {
    if (!reelRef.current) return false;
    reelRef.current = false;
    clearTimers();
    setPose(rest);
    walkTo(null);
    say('Intermission.', 2000);
    return true;
  };

  // Bubble shortcuts.
  const askNext = () => {
    const n = whatsNext(study);
    const onIt = typeof n.step === 'number' && n.step === context;
    setBubble(true);
    setExtra({ say: n.say + (onIt ? ' You\'re on it.' : ''), kind: 'help', step: onIt ? undefined : n.step, target: n.target });
    act(onIt ? 'thumbs' : 'think');
  };
  const explain = () => {
    setBubble(true);
    setExtra({ say: explainStep(context), kind: 'help' });
    withProp('book', 2400);
    act('read', { ms: 2200 });
  };
  const tellJoke = () => {
    setBubble(true);
    const trick = pick(TRICKS);
    act(trick, { mood: 'excited' });
    if (trick === 'dance') burst();
    setExtra({ say: pick(BUDDY_JOKES), kind: 'joke' });
  };
  const takeMeThere = () => {
    const step = extra?.step;
    if (typeof step !== 'number') return;
    setExtra(null);
    buddyEvent('goto', { step });
  };

  const nextTip = () => {
    setExtra(null);
    setBubble(true);
    setIdx(i => i + 1);
    act(pick(['wave', 'thumbs', 'look']));
  };

  const showMe = () => {
    const el = findTarget(target);
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
    if (stopReel()) return;
    perchRef.current = false;
    wanderRef.current = false;
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
    if (!d.moved) {
      d.moved = true;
      reelRef.current = false;
      perchRef.current = false;
      wanderRef.current = false;
      clearTimers();
      setDragging(true);
      setPose('dangle');
      setBubble(false);
    }
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

  const goHome = () => { perchRef.current = false; wanderRef.current = false; reelRef.current = false; setBubble(false); setExtra(null); if (x != null || y != null) walkTo(null); };

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
    const t = setTimeout(() => { if (!hovering.current) setBubble(false); }, 11000);
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
    trip: 'surprised', slip: 'surprised', sneeze: 'calm', hiccup: 'surprised', selfie: 'excited', magic: 'excited',
    fish: 'calm', reel: 'excited', fall: 'surprised', splat: 'dizzy', getup: 'neutral', crouch: 'neutral',
    jetpack: 'excited', elevator: 'whistle', pogo: 'excited', parachute: 'happy', slide: 'excited', pole: 'excited',
    bounce: 'excited', tuck: 'excited', cartwheel: 'excited', tiptoe: 'neutral', skate: 'happy', stretch: 'calm',
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
    <DripGear gear={gear} />
    <div className={`buddy-door no-print door-${door}${raised}`} aria-hidden="true">
      <div className="door-frame">
        <div className="door-inside" />
        <div className="door-panel"><span className="door-window">💧</span><span className="door-knob" /></div>
      </div>
    </div>
    <div
      ref={rootRef}
      className={`buddy no-print pose-${pose} face-${face} expr-${expr} prop-${prop}${PERCHED.has(pose) ? ' perched' : ''}${catchItem ? ` catch-${catchItem}` : ''}${x == null ? ' home' : ''}${raised}${dragging ? ' dragging' : ''}${away ? ' away' : ''}`}
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
          <div className="buddy-name">Drip <span>· {{ joke: 'comedian (self-appointed)', reaction: 'just noticed', help: 'here to help' }[extra?.kind] || 'your guide'}</span></div>
          <p onClick={finishTyping} aria-hidden="true">{typed}{!typedAll && <span className="buddy-caret" />}</p>
          <span className="sr-only" role="status" aria-live="polite">{text}</span>
          <div className="buddy-actions">
            {typeof extra?.step === 'number' && <button className="btn b-lime btn-xs" onClick={takeMeThere}>Take me there →</button>}
            {hasTarget && <button className="btn b-lime btn-xs" onClick={showMe}>👉 Show me</button>}
            {(tips.length > 1 || extra) && <button className="btn b-out btn-xs" onClick={nextTip}>{extra ? 'Back to tips' : 'Next tip'}</button>}
            <button className="link-btn buddy-off" onClick={onHide}>Hide Drip</button>
          </div>
          <div className="buddy-chips" role="group" aria-label="Ask Drip">
            <button onClick={askNext}>🧭 What's next?</button>
            <button onClick={explain}>💡 Explain this</button>
            <button onClick={tellJoke}>😄 Joke</button>
            <button onClick={showreel}>🎬 What can you do?</button>
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
