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
                      <td style={{ textAlign: 'right' }} className="num">{bill0 == null ? '—' : fmt.c(bill0 * y.factor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="fhn" style={{ marginTop: 8 }}>
            Budget coverage uses the proposed budget for every year (before inflation). The bill column scales today's
            5,000-gallon bill by the same factor{bill1 != null ? `; the final year matches the proposed ${fmt.c(bill1)}` : ''}.
            {plan.years.some(y => exp > 0 && y.revenue / exp < 1) && (
              <strong style={{ color: 'var(--red)' }}> Some years run below break-even — confirm the fund balance can carry them (Step 5).</strong>
            )}
          </div>
        </>
      )}
    </div>
  );
}
