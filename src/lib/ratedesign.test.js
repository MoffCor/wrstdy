import test from 'node:test';
import assert from 'node:assert/strict';

import {
  revenueRequirement, solveUniformMultiplier, solveDscrMultiplier, scaleSide,
  scaleProposedRates, phaseInPlan, billQuote, projectedOR,
} from './ratedesign.js';
import { totalRevenue, budgetTotal, operatingRatio, debtServiceCoverage, calcBill } from './calc.js';
import { makeSampleStudy } from './sample-study.js';
import {
  duplicateStudy, rollForwardStudy, pushUndo, UNDO_LIMIT, UNDO_COALESCE_MS, normalizeStudy,
} from './state.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}, got ${a}`);

// ─── Solving for a target ───────────────────────────────────────────────────

test('revenueRequirement is the budget times the target ratio', () => {
  assert.equal(revenueRequirement({ emp: { salaries: '1000' } }, 1.25), 1250);
});

test('solving for a target operating ratio lands on that ratio after rounding to cents', () => {
  const s = makeSampleStudy();
  for (const target of [1.0, 1.25, 1.5]) {
    const m = solveUniformMultiplier(s.classes, s.propBudget, target);
    const scaled = scaleProposedRates(s.classes, m);
    const or = operatingRatio(totalRevenue(scaled, true).monthly, budgetTotal(s.propBudget).total);
    // Rounding every rate to the cent moves revenue by a fraction of a percent.
    near(or, target, 0.01, `target ${target}`);
  }
});

test('projectedOR predicts the post-scaling ratio without mutating anything', () => {
  const s = makeSampleStudy();
  const before = JSON.stringify(s.classes);
  const m = solveUniformMultiplier(s.classes, s.propBudget, 1.4);
  near(projectedOR(s.classes, s.propBudget, m), 1.4, 1e-9);
  assert.equal(JSON.stringify(s.classes), before);
});

test('solving for a DSCR target produces that coverage', () => {
  const s = makeSampleStudy();
  const m = solveDscrMultiplier(s.classes, s.propBudget, 2);
  const rev = totalRevenue(s.classes, true).monthly * m;
  near(debtServiceCoverage(s.propBudget, rev), 2, 1e-9);
});

test('solvers return null instead of dividing by zero', () => {
  assert.equal(solveUniformMultiplier([], { emp: { salaries: '100' } }, 1.25), null);
  const s = makeSampleStudy();
  assert.equal(solveUniformMultiplier(s.classes, {}, 1.25), null);
  assert.equal(solveDscrMultiplier(s.classes, { emp: { salaries: '100' } }, 1.25), null, 'no debt → no DSCR');
});

// ─── Scaling rates ──────────────────────────────────────────────────────────

test('scaleSide scales base and every tier rate, rounded to the cent', () => {
  const side = { minCharge: '20.00', tiers: [{ gal: 1000, rate: '4.25' }, { gal: 2000, rate: '5.00', label: 'Block 2' }] };
  const out = scaleSide(side, 1.1);
  assert.equal(out.minCharge, '22.00');
  assert.equal(out.tiers[0].rate, '4.68');
  assert.equal(out.tiers[1].rate, '5.50');
  assert.equal(out.tiers[1].label, 'Block 2', 'labels survive');
  assert.equal(out.tiers[1].gal, 2000, 'breakpoints never move');
});

test('scaleSide leaves blank fields blank rather than inventing a $0.00 rate', () => {
  const out = scaleSide({ minCharge: '', tiers: [{ gal: 1000, rate: '' }] }, 1.2);
  assert.equal(out.minCharge, '');
  assert.equal(out.tiers[0].rate, '');
});

test('scaling bills is exactly linear (before rounding)', () => {
  const tiers = [{ gal: 2000, rate: 4 }, { gal: 5000, rate: 6 }];
  near(calcBill(30 * 1.2, tiers.map(t => ({ ...t, rate: t.rate * 1.2 })), 8000), calcBill(30, tiers, 8000) * 1.2, 1e-9);
});

test('scaleProposedRates touches only enabled classes, only the proposed side', () => {
  const s = makeSampleStudy();
  const out = scaleProposedRates(s.classes, 2);
  for (let i = 0; i < s.classes.length; i++) {
    const a = s.classes[i], b = out[i];
    assert.deepEqual(b.cur, a.cur, 'current side unchanged');
    if (!a.enabled) assert.deepEqual(b, a, 'disabled class unchanged');
  }
  const res = out.find(c => c.id === 'res');
  assert.equal(res.prop.minCharge, '60.00');
});

test('scaleProposedRates can be limited to chosen classes', () => {
  const s = makeSampleStudy();
  const out = scaleProposedRates(s.classes, 2, ['com']);
  assert.equal(out.find(c => c.id === 'res').prop.minCharge, s.classes.find(c => c.id === 'res').prop.minCharge);
  assert.notEqual(out.find(c => c.id === 'com').prop.minCharge, s.classes.find(c => c.id === 'com').prop.minCharge);
});

// ─── Phase-in ───────────────────────────────────────────────────────────────

test('phase-in uses equal compounding steps that land exactly on the target', () => {
  const plan = phaseInPlan(10000, 14500, 3);
  near(plan.years[2].revenue, 14500, 1e-6);
  near(plan.years[2].cumulativePct, 0.45, 1e-9);
  // Equal compounding steps, not equal percentage points.
  near(Math.pow(1 + plan.stepPct, 3), 1.45, 1e-9);
  assert.ok(plan.stepPct < 0.15, 'three 15% steps would overshoot a 45% total');
});

test('a one-year phase-in is just the full increase', () => {
  const plan = phaseInPlan(100, 130, 1);
  near(plan.stepPct, 0.3, 1e-12);
  assert.equal(plan.years.length, 1);
});

test('phase-in clamps silly year counts and refuses zero revenue', () => {
  assert.equal(phaseInPlan(100, 200, 0).years.length, 1);
  assert.equal(phaseInPlan(100, 200, 50).years.length, 10);
  assert.equal(phaseInPlan(0, 200, 3), null);
  assert.equal(phaseInPlan(100, 0, 3), null);
});

test('phase-in handles a decrease as well as an increase', () => {
  const plan = phaseInPlan(200, 100, 2);
  assert.ok(plan.stepPct < 0);
  near(plan.years[1].revenue, 100, 1e-9);
});

// ─── Bill quotes ────────────────────────────────────────────────────────────

test('billQuote gives current and proposed bills for every enabled class', () => {
  const s = makeSampleStudy();
  const q = billQuote(s.classes, 5000);
  assert.equal(q.length, s.classes.filter(c => c.enabled).length);
  const res = q.find(r => r.id === 'res');
  assert.equal(res.cur.toFixed(2), '44.25');
  assert.equal(res.prop.toFixed(2), '67.25');
  near(res.delta, 23, 1e-9);
});

test('billQuote treats negative or junk gallons as zero (base charge only)', () => {
  const s = makeSampleStudy();
  const res = billQuote(s.classes, -500).find(r => r.id === 'res');
  assert.equal(res.cur, 18);
  assert.equal(billQuote(s.classes, 'abc').find(r => r.id === 'res').prop, 30);
});

// ─── Duplicate / roll forward ───────────────────────────────────────────────

test('duplicateStudy gives a new id, a draft status, and an independent copy', () => {
  const s = makeSampleStudy();
  s.aiHistory = [{ role: 'user', content: 'x' }];
  const d = duplicateStudy(s);
  assert.notEqual(d.id, s.id);
  assert.equal(d.status, 'draft');
  assert.match(d.name, /\(Copy\)$/);
  assert.deepEqual(d.aiHistory, []);
  d.classes[0].prop.minCharge = '999';
  assert.notEqual(s.classes[0].prop.minCharge, '999', 'copy must not share objects with the original');
});

test('rolling forward makes this year\'s proposed rates next year\'s current rates', () => {
  const s = makeSampleStudy();
  const r = rollForwardStudy(s, { fy1EndingBalance: 63224.4 });
  assert.notEqual(r.id, s.id);
  assert.equal(Number(r.systemInfo.studyYear), Number(s.systemInfo.studyYear) + 1);
  const res0 = s.classes.find(c => c.id === 'res');
  const res1 = r.classes.find(c => c.id === 'res');
  assert.deepEqual(res1.cur, res0.prop);
  assert.deepEqual(res1.prop, res0.prop);
  assert.deepEqual(r.curBudget, normalizeStudy(s).propBudget);
  assert.equal(r.forecast.beginFundBalance, '63224');
  assert.equal(r.rolledForwardFrom.id, s.id);
  assert.equal(r.rolledForwardFrom.openingBalanceEstimated, true);
  assert.equal(r.status, 'draft');
});

test('rolling forward shifts the five-year schedules left by one year', () => {
  const s = makeSampleStudy();
  s.forecast.debtService = ['100', '200', '300', '400', '500'];
  const r = rollForwardStudy(s);
  assert.deepEqual(r.forecast.debtService, ['200', '300', '400', '500', '']);
  assert.deepEqual(r.forecast.knownItems[0].vals, ['18000', '', '', '', '']);
  assert.equal(r.forecast.beginFundBalance, s.forecast.beginFundBalance, 'no estimate → keep the entered balance');
});

// ─── Undo ───────────────────────────────────────────────────────────────────

test('pushUndo coalesces a burst of typing into one undo step', () => {
  let stack = [];
  stack = pushUndo(stack, 'A', 1000, 0);
  stack = pushUndo(stack, 'B', 1000 + UNDO_COALESCE_MS - 1, 1000);
  assert.deepEqual(stack, ['A']);
  stack = pushUndo(stack, 'C', 1000 + 5000, 1000 + UNDO_COALESCE_MS - 1);
  assert.deepEqual(stack, ['A', 'C']);
});

test('pushUndo is capped and never mutates its input', () => {
  let stack = [];
  for (let i = 0; i < UNDO_LIMIT + 10; i++) stack = pushUndo(stack, i, i * 10_000, (i - 1) * 10_000);
  assert.equal(stack.length, UNDO_LIMIT);
  assert.equal(stack[0], 10, 'oldest entries drop off first');
  const frozen = Object.freeze(['x']);
  assert.doesNotThrow(() => pushUndo(frozen, 'y', 99_999, 0));
});
