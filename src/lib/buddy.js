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

// Things the app tells him about (via lib/buddyBus.js) and how he takes them.
export const BUDDY_EVENTS = {
  undo: { pose: 'rewind', mood: 'excited', lines: ['Rewind! ⏪ If only pipes had Ctrl+Z.', 'Undone. Time travel: still undefeated.', 'Whoosh — back in time. Nobody saw that.'] },
  redo: { pose: 'spin', mood: 'excited', lines: ['Redo! Fast-forward ⏩', 'And we\'re back. Déjà vu, but useful.'] },
  export: { pose: 'throw', mood: 'excited', lines: ['Exported! I folded it into a paper airplane. Professionally.', 'Off it goes ✈️ Back-ups are self-care.', 'Saved to a file. Future you says thanks.'] },
  apply: { pose: 'celebrate', mood: 'excited', lines: ['Rates applied! Every proposed rate moved together. Ctrl+Z if you blink.', 'Done — the math did the math. Check the scorecard!'] },
  created: { pose: 'jump', mood: 'excited', lines: ['A fresh study! Smells like new spreadsheets.', 'New study, who dis? Let\'s start with Step 1.'] },
  duplicated: { pose: 'thumbs', mood: 'happy', lines: ['Twins! Change this copy as much as you like — the original is safe.', 'Copy made. Go wild; the original won\'t know.'] },
  rolled: { pose: 'celebrate', mood: 'excited', lines: ['Happy new rate year! 🎆 Last year\'s proposed rates are now current.', 'A whole year, just like that. Replace the opening balance with the audited figure in Step 5.'] },
  tourDone: { pose: 'celebrate', mood: 'excited', lines: ['Tour complete. There\'s no certificate, but I believe in you.', 'That\'s the tour. I\'ll be around if you need me.', 'Done. You now know more than most of the people at the meeting.'] },
  deleted: { pose: 'sad', mood: 'sad', lines: ['Goodbye, study. You were a good one. 😢', 'Gone. I\'ll hold a tiny moment of silence. …Okay, done.'] },
};

export const BYE_LINES = ['Okay, I\'ll be in the back. Press B if you need me!', 'Exit, stage right. 🚪', 'Taking five. Don\'t change the rates without me. (Kidding. Please do.)'];
export const BACK_LINES = ['I\'m back! Did I miss anything? I missed everything.', 'Ta-da! 🚪 Miss me?', 'Back from the break room. The coffee there is… water.'];
export const COFFEE_LINES = ['Coffee run! Back in a jiffy. ☕', 'BRB — refilling my mug. With water. Obviously.'];
export const COFFEE_BACK_LINES = ['Got coffee. Well, hot water with ambition.', 'Back! Fully caffeinated, emotionally hydrated.'];
export const TYPING_LINES = ['Ooh, numbers! 📝', 'Typing intensifies…', 'Taking notes. Mostly doodles.', 'Every digit counts. Literally.'];
export const HOVER_LINES = ['Oh! Hi. 👋', '*blushes in stick figure*', 'You can click me, you know.'];
export const MEDITATE_LINES = ['Ommmm… balanced budgets… ommm…', 'Finding my inner operating ratio.'];
export const WATCH_LINES = ['Is it five o\'clock yet?', 'Tick tock. Rates don\'t set themselves. Well — Step 4 kind of does.'];
export const TOUR_DONE_LINE = 'Grand tour complete! You\'ve visited all 8 steps. I hereby name you an honorary hydrologist. 🏅';

// Seasonal flavor: a hat decoration and a line, by month (0 = January).
export function seasonal(now = new Date()) {
  const m = now.getMonth();
  if (m === 9) return { badge: 'pumpkin', line: 'Spooky season 🎃 The scariest thing in here is a coverage ratio under 1.0.' };
  if (m === 11) return { badge: 'snow', line: 'Happy holidays! ❄️ Frozen pipes are not a rate structure.' };
  if (m === 0) return { badge: 'party', line: 'New year, new rates? Start next year\'s study from the ⋯ menu in any study.' };
  if (m === 6) return { badge: 'sun', line: 'Summer peak demand! Sprinklers everywhere. Tier 3 is having a great month.' };
  return { badge: null, line: null };
}

// Dry asides for getting around. Said now and then, never every time.
export const LADDER_LINES = ['Ladder. Expensed under "equipment, misc."', 'OSHA would like a word.', 'Three points of contact. I have four lines. We\'re fine.'];
export const BALLOON_LINES = ['Helium is not in the budget.', 'This is a normal way to travel.', 'Do not let go of the string. — me, to me'];
export const UMBRELLA_LINES = ['Mary Poppins was a consultant too.', 'Controlled descent.', 'It\'s not raining. It\'s strategy.'];
export const FLY_LINES = ['Please don\'t tell facilities.', 'I don\'t know how I do this either.'];

// Idle activities. Short and dry; he's busy, not performing.
export const PHONE_CALLS = [
  ['…mm-hm.', '…no, the rates are fine.', '…okay. Bye.'],
  ["…it's Drip.", '…line four, under "other".', '…you too.'],
  ['…can you hold?', '…', '…sorry. Go ahead.'],
  ['…yes, a ladder.', '…no, I have my own.', '…okay.'],
];
export const WATER_LINES = ['Somebody has to.', "It's coming along.", 'Not too much. Not too little.'];
export const SWEEP_LINES = ['Rounding errors. They get everywhere.', 'Tidying up.'];
export const READ_LINES = ['Good report. A little long.', 'Rereading the executive summary.', 'Page six is where it gets interesting.'];
export const LEAN_LINES = ['Just leaning.', 'Taking five. Four. Five.'];
export const PERCH_LINES = ['Better view from up here.', "Don't mind me.", 'I can see the whole budget from here.'];
export const WELCOME_BACK_LINES = ['Welcome back.', 'Oh — hi. Everything is where you left it.'];

// His desk plant grows with the days since he first showed up: a sprout,
// a few leaves, a bigger plant, then a flower after a couple of weeks.
export function plantStage(sinceIso, now = new Date()) {
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return 1;
  const days = Math.max(0, (now - since) / 86_400_000);
  return days < 2 ? 1 : days < 6 ? 2 : days < 14 ? 3 : 4;
}

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
  const season = seasonal(now).line;
  const hello = context === 'dashboard'
    ? [{ say: pick(greeting(now), rnd), target: '.hero-actions' }, ...(season ? [{ say: season }] : [])]
    : [];
  return [...alerts, ...hello, ...(lead ? [lead] : []), ...shuffled(rest, rnd)];
}
