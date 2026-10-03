// Rate-design helpers: the questions staff actually ask once the data is in.
//
//   "What across-the-board increase gets this system to a 1.25 operating ratio?"
//   "Can we phase that in over three years instead of one?"
//   "What will a customer using 3,500 gallons pay?"
//
// Everything here is pure and works on the same study shapes calc.js does, so
// the answers on screen, in the report, and in the tests are the same numbers.

import {
  nv, normalizeTiers, calcBill, totalRevenue, budgetTotal, operatingRatio,
  operatingExpenses, monthlyDebtService,
} from './calc.js';

// Revenue is linear in rates: scaling every base charge and every tier rate by
// m scales every bill — and therefore every class's revenue — by exactly m.
// That makes the "solve for a target" questions closed-form rather than
// iterative, and exact rather than approximate.

/** Monthly revenue needed for proposed rates to hit `targetOR` against `budget`. */
export function revenueRequirement(budget, targetOR = 1.25) {
  return budgetTotal(budget).total * nv(targetOR);
}

/**
 * Uniform multiplier on PROPOSED rates that makes proposed revenue cover the
 * proposed budget at `targetOR`. Returns null when there is nothing to scale
 * (no proposed revenue) or nothing to cover (no budget).
 */
export function solveUniformMultiplier(classes, budget, targetOR = 1.25) {
  const rev = totalRevenue(classes, true).monthly;
  const need = revenueRequirement(budget, targetOR);
  if (!(rev > 0) || !(need > 0)) return null;
  return need / rev;
}

/**
 * Multiplier needed so proposed debt service coverage reaches `targetDSCR`.
 * DSCR = (revenue − O&M) / debt, so revenue must be O&M + target × debt.
 */
export function solveDscrMultiplier(classes, budget, targetDSCR = 1.25) {
  const debt = monthlyDebtService(budget);
  const rev = totalRevenue(classes, true).monthly;
  if (!(debt > 0) || !(rev > 0)) return null;
  return (operatingExpenses(budget) + nv(targetDSCR) * debt) / rev;
}

// Rates are published to the cent; base charges to the cent too. Rounding
// after scaling means the solved revenue lands within a few cents per customer
// of the target rather than exactly on it — which is what a real tariff does.
// Round UP to the cent. Revenue never falls when a rate rises, so rounding
// every scaled rate up guarantees the result meets the target the user asked
// for; rounding to nearest left it a hair short about half the time (1.25 →
// 1.24996), which then failed the scorecard's own ≥ 1.25 test. The epsilon
// keeps float noise (20 × 1.1 = 22.000000000000004) from adding a cent.
const cents = (v) => (Math.ceil(nv(v) * 100 - 1e-6) / 100).toFixed(2);

/** Scale one rate side (base charge + every tier rate) by `m`, rounded up to the cent. */
export function scaleSide(side = {}, m = 1) {
  const tiers = Array.isArray(side.tiers) ? side.tiers : [];
  return {
    ...side,
    minCharge: String(side.minCharge ?? '').trim() === '' ? side.minCharge : cents(nv(side.minCharge) * m),
    tiers: tiers.map(t => ({
      ...t,
      rate: String(t?.rate ?? '').trim() === '' ? t?.rate : cents(nv(t.rate) * m),
    })),
  };
}

/**
 * Apply `m` to the proposed side of every enabled class (or only `classIds`).
 * Disabled classes are untouched so a re-enabled class keeps its own rates.
 */
export function scaleProposedRates(classes = [], m = 1, classIds = null) {
  const only = classIds ? new Set(classIds) : null;
  return classes.map(c => {
    if (!c?.enabled || (only && !only.has(c.id))) return c;
    return { ...c, prop: scaleSide(c.prop, m) };
  });
}

/**
 * Plan a multi-year phase-in from `fromRevenue` to `toRevenue`.
 *
 * Boards routinely balk at a single 40% increase and adopt the same total as
 * three ~12% steps. Equal COMPOUNDING steps are used (not equal percentage
 * points), because each year's increase applies to the prior year's rates:
 * three 13.3% steps reach +45%, three 15% steps would overshoot to +52%.
 *
 * @returns {{ stepPct:number, years:Array<{year:number, factor:number, revenue:number, cumulativePct:number}> } | null}
 */
export function phaseInPlan(fromRevenue, toRevenue, years = 3) {
  const from = nv(fromRevenue);
  const to = nv(toRevenue);
  const n = Math.max(1, Math.min(10, Math.round(nv(years)) || 1));
  if (!(from > 0) || !(to > 0)) return null;
  const step = Math.pow(to / from, 1 / n);
  const out = [];
  for (let y = 1; y <= n; y++) {
    const factor = Math.pow(step, y);
    out.push({ year: y, factor, revenue: from * factor, cumulativePct: factor - 1 });
  }
  return { stepPct: step - 1, years: out };
}

/**
 * Bill for every enabled class at `gallons`, current vs proposed — the
 * "what will my bill be" question from a board member or a customer.
 */
export function billQuote(classes = [], gallons = 5000) {
  const g = Math.max(0, nv(gallons));
  return classes.filter(c => c?.enabled).map(c => {
    const cur = calcBill(c.cur?.minCharge, normalizeTiers(c.cur?.tiers), g);
    const prop = calcBill(c.prop?.minCharge, normalizeTiers(c.prop?.tiers), g);
    return {
      id: c.id,
      name: c.name || c.id,
      cur,
      prop,
      delta: prop - cur,
      pct: cur > 0 ? (prop - cur) / cur : null,
    };
  });
}

/** Proposed operating ratio after applying multiplier `m`. */
export function projectedOR(classes, budget, m = 1) {
  return operatingRatio(totalRevenue(classes, true).monthly * nv(m), budgetTotal(budget).total);
}
