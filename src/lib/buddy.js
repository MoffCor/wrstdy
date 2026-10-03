// Drip — the stick-figure guide. Everything he says, holds, and reacts to lives
// here so the copy can be reviewed (and the reaction logic tested) without
// touching the animation code in components/StickBuddy.jsx.
//
// Each tip: { say, target? }. `target` is a CSS selector inside the app; when
// it matches, Drip offers "Show me", walks over, points, and the element
// pulses. Selectors that don't match on the current screen are just skipped.
import { totalRevenue, budgetTotal, operatingRatio, affordabilityIndex } from './calc.js';
import { validateStudy, summarizeFindings } from './validate.js';
import { stepCompletion } from './progress.js';

export const BUDDY_SETTING = 'wrs-buddy';

export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length) % arr.length];

// What he carries on each screen.
export const BUDDY_PROPS = {
  dashboard: 'mug',
  0: 'clipboard',
  1: 'calculator',
  2: 'magnifier',
  3: 'chart',
  4: 'telescope',
  5: 'juggle',
  6: 'bulb',
  7: 'report',
};

export function greeting(now = new Date()) {
  const h = now.getHours();
  const d = now.getDay();
  const lines = [];
  if (h < 5) lines.push("It's very late. Or very early. Either way, I brought coffee. Hi, I'm Drip.");
  else if (h < 12) lines.push("Good morning! I'm Drip. I keep the water flowing and the rates honest.");
  else if (h < 17) lines.push("Good afternoon! I'm Drip, your rate-study sidekick. Mostly side, some kick.");
  else lines.push("Evening shift, huh? I'm Drip. Let's make this quick and correct.");
  if (d === 1) lines.push('Happy Monday. I said it with a straight face. Mostly straight. I\'m a line.');
  if (d === 5) lines.push("It's Friday! Rates don't take weekends, but you should.");
  return lines;
}

export const BUDDY_TIPS = {
  dashboard: [
    { say: 'Start a study up here. Blank, sample, or straight from the map — your call.', target: '.hero-actions' },
    { say: 'Never done one? Load the sample. It\'s a test drive, but nobody yells about the mileage.', target: '.hero-actions' },
    { say: 'These tiles are the 10,000-foot view. Orange means "a human should look at this." That\'s you.', target: '.kpi-row' },
    { say: 'Search by system, PWS ID or county. I tried searching by vibes once. Zero results.', target: '.dash-toolbar' },
    { say: 'Every card shows progress and the proposed budget coverage ratio. Green is good. I am also green-adjacent.', target: '.study-grid' },
    { say: 'Duplicate a study to try a bolder option without wrecking the original. Like a save point.', target: '.study-grid' },
    { say: 'Want the grand tour? The Guide button up top has one. I\'m in it. Briefly. My agent negotiated.', target: '.hdr-tools' },
    { say: 'You can drag me around, by the way. Gently. I bruise like a stick figure.' },
  ],
  0: [
    { say: 'Step 1: who are we helping? System name, PWS ID, county. Name-tag-at-a-potluck basics.', target: '.step-guide' },
    { say: 'Median household income drives affordability later. Skip it and I can\'t tell if rates are fair.' },
    { say: 'These dots are your eight steps. ✓ means it has data, ! means something needs fixing.', target: '.stepper' },
    { say: 'Add an address and hit Geocode, and the system shows up on the map. I love a good pin.' },
    { say: 'Alt + → jumps to the next step. Alt + 1–8 jumps anywhere. I just walk. Slowly. With style.' },
  ],
  1: [
    { say: 'Customer classes! Residential, commercial, the whole family. Current rates and proposed rates side by side.' },
    { say: 'Try the bill calculator — type any usage and every class\'s bill updates. Great for board questions.', target: '.bill-calc' },
    { say: 'Tiered rates are stairs: the more water you use, the higher you climb. Cardio for wallets.' },
    { say: 'Usage distribution makes revenue way more accurate than averages. Averages lie. I read it in a pamphlet.' },
    { say: 'Minimum charge covers the fixed costs of just being connected. Like a gym membership, but useful.' },
  ],
  2: [
    { say: 'Budget time. Every dollar the system spends goes here. Even the coffee. Especially the coffee.', target: '.step-guide' },
    { say: 'Loan payments go in the debt section — debt coverage depends on them, and so does my blood pressure.' },
    { say: 'Proposed budget is next year\'s plan. Be realistic — pumps don\'t care about optimism.' },
    { say: 'Don\'t forget depreciation and a little set-aside for repairs. Pipes break on holidays. It\'s the law.' },
  ],
  3: [
    { say: 'This is the scorecard. Budget coverage above 1.25 is healthy. Below 1.0, the bucket leaks.' },
    { say: 'My favorite part: tell the Rate Design Assistant a target and it solves for the rates. No algebra. You\'re welcome.', target: '.rd-card' },
    { say: 'Click Apply and every proposed rate scales together. Changed your mind? Ctrl+Z. I won\'t tell.', target: '.rd-card' },
    { say: 'Lenders love a debt service coverage of 1.2 or more. Switch the assistant to DSCR to target it.', target: '.rd-card' },
    { say: 'Affordability compares a 5,000-gallon bill to household income. Under 2% is comfortable for most families.' },
  ],
  4: [
    { say: 'Five years ahead. Costs inflate, fund balances wobble. I\'d bring a raincoat.' },
    { say: 'Watch the ending fund balance. If it goes negative, the board will ask why. Better we ask first.' },
    { say: 'Known items are one-time costs in a specific year — a new pump, a tank repaint. Plan them here.' },
    { say: 'Inflation at 3% sounds tiny until year five. Compounding: great in savings, rude in budgets.' },
  ],
  5: [
    { say: 'Scenarios let you lean on one class more than another. Try a preset, it won\'t bite.' },
    { say: 'Big jump scaring people? The phase-in planner spreads it over a few years. Gentle. Like a slow drip. Hi.', target: '.phase-plan' },
    { say: 'Rainy-day fund math is down here. It\'s never raining until it\'s pouring. Plan for pouring.' },
    { say: 'I\'m juggling because that\'s what scenarios are. Don\'t look at me, I\'ll drop one.' },
  ],
  6: [
    { say: 'AI analysis writes a first draft. Read it like a hawk — it\'s confident, not omniscient.' },
    { say: 'Ask follow-ups in plain English. "Explain this to a board member who hates math" works great.' },
    { say: 'The AI only sees the numbers you entered. Garbage in, eloquent garbage out.' },
  ],
  7: [
    { say: 'The finish line! Check the Data Check, then export PDF or Word for the board packet.' },
    { say: 'Next year, use "Start next year\'s study" in this menu. Proposed rates become current. Circle of life.', target: '.ws-actions .menu' },
    { say: 'Want to try something bolder without wrecking this one? Duplicate the study first.', target: '.ws-actions .menu' },
    { say: 'Mark the study Complete when the board adopts it. Then go outside. Touch grass. Water it.' },
  ],
};

export const BUDDY_JOKES = [
  'Why did the water bill go to therapy? Too many unresolved tiers.',
  "I'm not short. I'm low-flow.",
  'Hey! That tickles. I\'m mostly lines, but still.',
  'Fun fact: I\'m 0% water. Huge disappointment to my parents.',
  'A leaky faucet can waste 3,000 gallons a year. I tell everyone. I have no friends.',
  'I put my savings in a reserve fund. It\'s called a puddle.',
  'Coverage ratio jokes are funny. Ratio-nally speaking.',
  'Boop.',
  'What do you call a water system with perfect rates? Well-adjusted.',
  'I tried to get a job as a pipe. They said I was too straight.',
  'My favorite exercise? Running the numbers.',
  'Knock knock. Who\'s there? Water. Water who? Water you doing clicking me, there\'s work to do!',
  'I asked the budget for a raise. It said "we\'ll see in Year 3."',
  'I\'m great at tiered rates. Ask me anything above 5,000 gallons.',
  'Why don\'t meters ever lie? They always give an accurate reading.',
  'I\'d tell you a sewer joke, but it\'s a different rate class.',
  'Hydrate or diedrate. That\'s my whole philosophy.',
  'I was going to be a pie chart, but I didn\'t have the dough.',
];

export const IDLE_QUIPS = [
  '♪ hmm hmm hmm ♪',
  'Is it hot in here or is it just the summer peak demand?',
  '*taps foot*',
  'I counted the pixels. There are a lot.',
  'Just stretching. Stick figures get stiff.',
  'Did you hydrate today?',
  '…thinking about tiers…',
  'I could go for a nice cold glass of me. Wait.',
];

export const WAKE_LINES = [
  'Huh?! I wasn\'t sleeping. I was resting my eyes. Both of them.',
  'Oh! You\'re back! I kept your seat warm. Metaphorically. I\'m cold-water rated.',
  '*snort* — Ahem. Where were we? Rates. Yes. Rates.',
];

export const DRAG_LINES = ['Wheee!', 'Put me down! …Okay, this is fun.', 'I\'m flying! Sort of. Mostly dangling.', 'Easy! I\'m load-bearing.'];
export const DIZZY_LINES = ['Okay okay, the room is spinning…', 'I see three of you. All very productive.', 'Stop! My lines are tangled!'];

// Small, comparable facts about a study. Drip compares successive snapshots to
// react when the numbers move.
export function buddyMetrics(study) {
  if (!study) return null;
  const summary = summarizeFindings(validateStudy(study));
  const rev = totalRevenue(study.classes || [], true).monthly;
  const exp = budgetTotal(study.propBudget || {}).total;
  return {
    errors: summary.error,
    or: rev > 0 ? operatingRatio(rev, exp) : null,
    done: stepCompletion(study).filter(Boolean).length,
  };
}

// What changed between two metric snapshots that is worth a reaction, most
// important first. Returns { kind, pose, mood, say } or null.
export function buddyReaction(prev, next) {
  if (!prev || !next) return null;
  if (prev.errors > 0 && next.errors === 0) {
    return { kind: 'clean', pose: 'celebrate', mood: 'excited', say: 'Data check is clean! Not a single issue. I\'m doing a little dance.' };
  }
  if (prev.or != null && next.or != null && prev.or < 1.25 && next.or >= 1.25) {
    return { kind: 'healthy', pose: 'celebrate', mood: 'excited', say: `Budget coverage ${next.or.toFixed(2)} — that's healthy! Confetti budget: approved.` };
  }
  if (prev.or != null && next.or != null && prev.or >= 1 && next.or < 1) {
    return { kind: 'underwater', pose: 'worry', mood: 'worried', say: `Uh-oh. Budget coverage dipped to ${next.or.toFixed(2)}. The system would spend more than it earns.` };
  }
  if (next.errors < prev.errors) {
    return { kind: 'fixed', pose: 'thumbs', mood: 'happy', say: next.errors === 1 ? 'Nice fix! Just one issue left.' : `Nice fix! ${next.errors} issues to go.` };
  }
  if (next.errors > prev.errors) {
    return { kind: 'newIssue', pose: 'think', mood: 'neutral', say: 'Hmm, the data check spotted something new. The red ! on the stepper shows where.' };
  }
  if (next.done > prev.done) {
    return { kind: 'stepDone', pose: 'thumbs', mood: 'happy', say: `Another step filled in — ${next.done} of 8. Look at you go.` };
  }
  return null;
}

// Alerts from the study's actual numbers. The first one that applies leads
// when a study is opened.
export function buddyAlerts(study) {
  if (!study) return [];
  const out = [];
  const m = buddyMetrics(study);
  if (m.errors > 0) {
    out.push({
      say: `Psst — ${m.errors} ${m.errors === 1 ? 'thing needs' : 'things need'} fixing. I'd do it, but I have no fingers. Just… lines.`,
      target: '.stepper-meta .health-chip',
      mood: 'worried',
    });
  }
  if (m.or != null && m.or < 1) {
    out.push({
      say: `Proposed budget coverage is ${m.or.toFixed(2)} — under 1.0, so the system spends more than it brings in. The Rate Design Assistant in Step 4 fixes that in one click.`,
      mood: 'worried',
    });
  }
  const mhi = study.demographics?.medianMonthlyHHI;
  const ai = mhi ? affordabilityIndex(study.classes || [], true, mhi) : null;
  if (ai != null && ai >= 0.025) {
    out.push({
      say: `Heads up: a 5,000-gallon bill is ${(ai * 100).toFixed(1)}% of household income. Above 2.5% gets tough for families — maybe phase it in?`,
      mood: 'worried',
    });
  }
  return out;
}

// Fisher–Yates on a copy, with an injectable random source for tests.
export function shuffled(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// What Drip says in a context: study alerts first, then the screen's lead tip,
// then the rest shuffled so repeat visits don't feel scripted.
export function buddyOpening(context, study, { now = new Date(), rnd = Math.random } = {}) {
  const alerts = context === 'dashboard' ? [] : buddyAlerts(study);
  const [lead, ...rest] = BUDDY_TIPS[context] || [];
  const hello = context === 'dashboard' ? [{ say: pick(greeting(now), rnd), target: '.hero-actions' }] : [];
  return [...alerts, ...hello, ...(lead ? [lead] : []), ...shuffled(rest, rnd)];
}
