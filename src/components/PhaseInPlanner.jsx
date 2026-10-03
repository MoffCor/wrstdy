import { useState } from 'react';
import { fmt, totalRevenue, budgetTotal, cost5000 } from '../lib/calc.js';
import { phaseInPlan } from '../lib/ratedesign.js';

/**
 * Phase-In Planner: splits the move from current to proposed revenue into
 * equal compounding annual steps, and shows what each step means for the
 * budget coverage ratio and the typical 5,000-gallon bill.
 */
export function PhaseInPlanner({ study }) {
  const [years, setYears] = useState(3);
  const classes = study.classes || [];
  const from = totalRevenue(classes, false).monthly;
  const to = totalRevenue(classes, true).monthly;
  const exp = budgetTotal(study.propBudget || {}).total;
  const plan = phaseInPlan(from, to, years);
  const bill0 = cost5000(classes, false);
  const bill1 = cost5000(classes, true);
  // The typical bill moves on its own path: proposed rates are rarely a
  // uniform multiple of current ones (a new tier, a bigger base charge), so
  // scaling today's bill by the revenue factor would miss the proposed bill.
  // Step it geometrically from today's bill to the proposed bill instead.
  const billAt = (y, n) => {
    if (bill0 == null || bill1 == null) return null;
    if (bill0 > 0 && bill1 > 0) return bill0 * (bill1 / bill0) ** (y / n);
    return bill0 + (bill1 - bill0) * (y / n);
  };

  return (
    <div className="card phase-plan">
      <div className="sh">Phase-In Planner</div>
      {!plan ? (
        <p style={{ fontSize: 12, color: 'var(--mid)' }}>
          Enter both current and proposed rates in Step 2 to plan a multi-year phase-in.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.6 }}>
            Reach the proposed rates in equal annual steps instead of one jump. Each year's increase applies to the
            previous year's rates, so the steps compound — {years} steps of <strong>{fmt.pctOf(plan.stepPct, 1)}</strong> add
            up to the full <strong>{fmt.pctOf(to - from, from)}</strong>.
          </p>
          <div className="seg" role="radiogroup" aria-label="Phase-in years" style={{ marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} role="radio" aria-checked={years === n} className={years === n ? 'on' : ''} onClick={() => setYears(n)}>
                {n === 1 ? 'All at once' : `${n} years`}
              </button>
            ))}
          </div>
          <div className="tbl-scroll">
            <table className="dt">
              <caption className="sr-only">Phase-in schedule by year</caption>
              <thead>
                <tr>
                  <th>Year</th>
                  <th style={{ textAlign: 'right' }}>Increase</th>
                  <th style={{ textAlign: 'right' }}>Monthly revenue</th>
                  <th style={{ textAlign: 'right' }}>Budget coverage</th>
                  <th style={{ textAlign: 'right' }}>Bill @ 5,000 gal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Today</td>
                  <td style={{ textAlign: 'right' }}>—</td>
                  <td style={{ textAlign: 'right' }} className="num">{fmt.c(from)}</td>
                  <td style={{ textAlign: 'right' }} className="num">{exp > 0 ? (from / exp).toFixed(2) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="num">{fmt.cd(bill0)}</td>
                </tr>
                {plan.years.map(y => {
                  const or = exp > 0 ? y.revenue / exp : null;
                  return (
                    <tr key={y.year}>
                      <td>Year {y.year}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmt.pctOf(plan.stepPct, 1)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmt.c(y.revenue)}</td>
                      <td style={{ textAlign: 'right' }} className={'num ' + (or == null ? '' : or >= 1.25 ? 'pos' : or < 1 ? 'neg' : '')}>{or == null ? '—' : or.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{billAt(y.year, years) == null ? '—' : fmt.cd(billAt(y.year, years))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="fhn" style={{ marginTop: 8 }}>
            Budget coverage uses the proposed budget for every year (before inflation). The bill column steps today's
            5,000-gallon bill toward the proposed bill in equal percentage steps{bill1 != null ? `, reaching the proposed ${fmt.cd(bill1)} in the final year` : ''}.
            {plan.years.some(y => exp > 0 && y.revenue / exp < 1) && (
              <strong style={{ color: 'var(--red)' }}> Some years run below break-even — confirm the fund balance can carry them (Step 5).</strong>
            )}
          </div>
        </>
      )}
    </div>
  );
}
