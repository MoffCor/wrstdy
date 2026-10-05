import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDDY_TIPS, BUDDY_PROPS, BUDDY_JOKES, buddyOpening, buddyAlerts, buddyMetrics,
  buddyReaction, greeting, shuffled, pick, BUDDY_EVENTS, seasonal, plantStage, PHONE_CALLS,
  whatsNext, explainStep, glossaryFor, stepFindings, MOVE_LINES, ACTIVITY_LINES, FISH_CATCHES, PRO_TIPS,
  IDLE_QUIPS, WAKE_LINES, SHOWREEL_OPENERS, SHOWREEL_CLOSERS,
} from './buddy.js';
import { validateStudy } from './validate.js';
import { buddyEvent, onBuddyEvent } from './buddyBus.js';
import { makeSampleStudy } from './sample-study.js';
import { newStudy } from './state.js';

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('every screen has tips and a prop', () => {
  for (const ctx of ['dashboard', 0, 1, 2, 3, 4, 5, 6, 7]) {
    assert.ok(BUDDY_TIPS[ctx]?.length >= 3, `tips for ${ctx}`);
    assert.ok(BUDDY_PROPS[ctx], `prop for ${ctx}`);
    for (const t of BUDDY_TIPS[ctx]) assert.equal(typeof t.say, 'string');
  }
  assert.ok(BUDDY_JOKES.length >= 15);
});

test('shuffled is a permutation and does not mutate', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffled(a, seq(0.1, 0.7, 0.3, 0.9));
  assert.deepEqual([...b].sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
  assert.equal(pick(['x', 'y'], () => 0.99), 'y');
});

test('greeting varies by time of day and adds weekday lines', () => {
  assert.match(greeting(new Date(2026, 9, 5, 9))[0], /morning/i);     // Monday
  assert.ok(greeting(new Date(2026, 9, 5, 9)).some(l => /Monday/.test(l)));
  assert.match(greeting(new Date(2026, 9, 9, 14))[0], /afternoon/i);  // Friday
  assert.ok(greeting(new Date(2026, 9, 9, 14)).some(l => /Friday/.test(l)));
  assert.match(greeting(new Date(2026, 9, 7, 2))[0], /late|early/i);
});

test('opening keeps the lead tip first after alerts; dashboard leads with hello', () => {
  const open = buddyOpening(3, makeSampleStudy(), { rnd: () => 0.5 });
  const lead = BUDDY_TIPS[3][0];
  assert.ok(open.includes(lead));
  assert.equal(open.length, buddyAlerts(makeSampleStudy()).length + BUDDY_TIPS[3].length);
  const dash = buddyOpening('dashboard', null, { now: new Date(2026, 9, 6, 10), rnd: () => 0 });
  assert.match(dash[0].say, /morning/i);
  assert.match(dash[1].say, /Spooky/, 'October adds a seasonal line');
  assert.equal(dash[2], BUDDY_TIPS.dashboard[0]);
  const may = buddyOpening('dashboard', null, { now: new Date(2026, 4, 6, 10), rnd: () => 0 });
  assert.equal(may[1], BUDDY_TIPS.dashboard[0], 'no seasonal line in May');
});

test('alerts flag a system spending more than it earns', () => {
  const s = makeSampleStudy();
  // Cut every proposed rate to almost nothing.
  s.classes = s.classes.map(c => ({ ...c, prop: { ...c.prop, minCharge: '1', tiers: (c.prop?.tiers || []).map(t => ({ ...t, rate: '0.01' })) } }));
  const alerts = buddyAlerts(s);
  assert.ok(alerts.some(a => /under 1\.0/.test(a.say)), JSON.stringify(alerts.map(a => a.say)));
  assert.deepEqual(buddyAlerts(null), []);
});

test('metrics of an empty study have no operating ratio', () => {
  const m = buddyMetrics(newStudy());
  assert.equal(m.or, null);
  assert.equal(typeof m.errors, 'number');
});

test('reactions: priorities and thresholds', () => {
  const base = { errors: 2, or: 1.1, done: 3 };
  assert.equal(buddyReaction(null, base), null);
  assert.equal(buddyReaction(base, base), null);
  assert.equal(buddyReaction(base, { ...base, errors: 0 }).kind, 'clean');
  assert.equal(buddyReaction(base, { ...base, or: 1.3 }).kind, 'healthy');
  assert.equal(buddyReaction({ ...base, or: 1.05 }, { ...base, or: 0.9 }).kind, 'underwater');
  assert.equal(buddyReaction(base, { ...base, errors: 1 }).kind, 'fixed');
  assert.match(buddyReaction(base, { ...base, errors: 1 }).say, /one issue/);
  assert.equal(buddyReaction(base, { ...base, errors: 3 }).kind, 'newIssue');
  assert.equal(buddyReaction(base, { ...base, done: 4 }).kind, 'stepDone');
  // Clean data outranks a simultaneous ratio change.
  assert.equal(buddyReaction(base, { errors: 0, or: 1.4, done: 3 }).kind, 'clean');
  assert.equal(buddyReaction(base, { ...base, or: 1.3 }).pose, 'celebrate');
});

test('every app event has a pose and lines', () => {
  for (const [k, ev] of Object.entries(BUDDY_EVENTS)) {
    assert.equal(typeof ev.pose, 'string', k);
    assert.ok(ev.lines.length >= 2, k);
  }
  assert.equal(seasonal(new Date(2026, 9, 1)).badge, 'pumpkin');
  assert.equal(seasonal(new Date(2026, 3, 1)).badge, null);
});

test('the event bus delivers to subscribers and survives a throwing one', () => {
  const got = [];
  const off1 = onBuddyEvent(() => { throw new Error('boom'); });
  const off2 = onBuddyEvent(e => got.push(e));
  buddyEvent('export', { id: 'x' });
  off1(); off2();
  buddyEvent('undo');
  assert.deepEqual(got, [{ type: 'export', id: 'x' }]);
});

test('his plant grows with the days, and a bad date is a sprout', () => {
  const start = new Date(2026, 9, 1, 9);
  const at = (d) => new Date(start.getTime() + d * 86_400_000);
  assert.equal(plantStage(start.toISOString(), at(0)), 1);
  assert.equal(plantStage(start.toISOString(), at(3)), 2);
  assert.equal(plantStage(start.toISOString(), at(10)), 3);
  assert.equal(plantStage(start.toISOString(), at(30)), 4);
  assert.equal(plantStage('not a date', at(30)), 1);
  for (const call of PHONE_CALLS) assert.ok(call.length >= 2);
});

test('no line leans on innuendo', () => {
  const all = [
    ...BUDDY_JOKES, ...IDLE_QUIPS, ...WAKE_LINES, ...PRO_TIPS, ...SHOWREEL_OPENERS, ...SHOWREEL_CLOSERS,
    ...Object.values(MOVE_LINES).flat(), ...Object.values(ACTIVITY_LINES).flat(),
    ...Object.values(BUDDY_TIPS).flat().map(t => t.say),
  ];
  assert.ok(!all.some(j => /too straight|mostly straight|straight pipe/i.test(j)));
});

test('every way of getting about and every bit has something to say', () => {
  const modes = ['ladder', 'balloon', 'stairs', 'trampoline', 'rope', 'jetpack', 'elevator', 'pogo', 'fly',
    'umbrella', 'parachute', 'slide', 'pole', 'jump', 'skate', 'cartwheel', 'moonwalk', 'tiptoe'];
  for (const m of modes) assert.ok(MOVE_LINES[m]?.length >= 2, `no lines for ${m}`);
  for (const [k, lines] of Object.entries(ACTIVITY_LINES)) assert.ok(lines.length >= 2, `too few lines for ${k}`);
  assert.deepEqual(FISH_CATCHES.map(c => c.item).sort(), ['boot', 'dollar', 'drop', 'fish']);
  assert.ok(PRO_TIPS.every(t => t.startsWith('Tip: ')));
  assert.equal(new Set(BUDDY_JOKES).size, BUDDY_JOKES.length, 'a joke is repeated');
});

test("what's next: no study, an empty study, the sample", () => {
  assert.equal(whatsNext(null).target, '.hero-actions');
  const empty = whatsNext(newStudy('x'));
  assert.equal(typeof empty.step, 'number');
  assert.ok(empty.step < 6, 'an empty study should be sent to a data step');
  const sample = makeSampleStudy();
  const n = whatsNext(sample);
  assert.ok(n.step >= 0 && n.step <= 7);
  assert.ok(!/Step \d+, Step/.test(n.say), n.say);
  // A blocking finding wins over everything else.
  const err = validateStudy(sample).find(f => f.severity === 'error');
  if (err) assert.equal(n.step, err.step);
});

test('explain and glossary', () => {
  for (let i = 0; i < 8; i++) assert.ok(explainStep(i).length > 20, `step ${i}`);
  assert.match(explainStep('dashboard'), /dashboard/);
  assert.match(glossaryFor('Median Household Income — MONTHLY ($)'), /MHI/);
  assert.match(glossaryFor('Inflation Rate (%/yr)'), /13%/);
  assert.match(glossaryFor('Block 2 rate per 1,000 gallons'), /per 1,000/);
  assert.match(glossaryFor('Target Fund Balance ($)'), /cushion/);
  assert.match(glossaryFor('Revenue Growth (%/yr)'), /Growth/);
  assert.equal(glossaryFor('Separately metered accounts'), null, '"rate" inside a word is not a rate');
  assert.equal(glossaryFor(''), null);
  assert.equal(glossaryFor('Something unrelated'), null);
});

test('step findings: only that step, never info, capped', () => {
  const s = makeSampleStudy();
  for (let step = 0; step < 8; step++) {
    const got = stepFindings(s, step, { limit: 1 });
    assert.ok(got.length <= 1);
    const expected = validateStudy(s).filter(f => f.step === step && f.severity !== 'info');
    assert.equal(got.length, Math.min(1, expected.length));
  }
  assert.deepEqual(stepFindings(null, 2), []);
  assert.deepEqual(stepFindings(s, 'dashboard'), []);
});
