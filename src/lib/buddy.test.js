import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDDY_TIPS, BUDDY_PROPS, BUDDY_JOKES, buddyOpening, buddyAlerts, buddyMetrics,
  buddyReaction, greeting, shuffled, pick, BUDDY_EVENTS, seasonal,
} from './buddy.js';
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
