import { useState } from 'react';
import {
  nv, fmt, totalRevenue, budgetTotal, operatingRatio, debtServiceCoverage,
  affordabilityIndex, monthlyDebtService, cost5000,
} from '../lib/calc.js';
import {
  solveUniformMultiplier, solveDscrMultiplier, scaleProposedRates, revenueRequirement,
} from '../lib/ratedesign.js';
import { ConfirmModal } from './ConfirmModal.jsx';
import { buddyEvent } from '../lib/buddyBus.js';
import { pushToast } from './Toasts.jsx';

const OR_PRESETS = [1.0, 1.1, 1.25, 1.5];

/**
 * Rate Design Assistant — solves for the uniform change to proposed rates that
 * hits a target budget coverage ratio or debt service coverage, previews the
 * consequences (affordability, the 5,000-gallon bill), and applies it in one
 * click. Revenue is linear in rates, so the answer is exact, not iterative.
 */
export function RateDesignPanel({ study, onField }) {
  const classes = study.classes || [];
  const budget = study.propBudget || {};
  const mhi = study.demographics?.medianMonthlyHHI;
  const hasDebt = monthlyDebtService(budget) > 0;
  const [mode, setMode] = useState('or'); // 'or' | 'dscr'
  const [target, setTarget] = useState('1.25');
  const [confirm, setConfirm] = useState(false);

  const rev = totalRevenue(classes, true).monthly;
  const exp = budgetTotal(budget).total;
  const t = nv(target);
  // Only a sensible positive target produces a multiplier; a blank, zero or
  // negative target would otherwise print a stray "0" or, via Apply, write
  // zero or negative rates.
  const validTarget = Number.isFinite(t) && t > 0 && t <= 5;
  const raw = !validTarget ? null : mode === 'dscr'
    ? solveDscrMultiplier(classes, budget, t)
    : solveUniformMultiplier(classes, budget, t);
  const m = Number.isFinite(raw) && raw > 0 ? raw : null;

  if (!(rev > 0) || !(exp > 0)) {
    return (
      <div className="card rd-card">
        <div className="sh">Rate Design Assistant</div>
        <p className="rd-empty">
          Enter proposed rates (Step 2) and a proposed budget (Step 3), and this panel will solve for the
          exact rate change that reaches your target budget coverage ratio or loan covenant.
        </p>
      </div>
    );
  }

  const scaled = m ? scaleProposedRates(classes, m) : classes;
  const nowOR = operatingRatio(rev, exp);
  const newRev = totalRevenue(scaled, true).monthly;
  const newOR = operatingRatio(newRev, exp);
  const nowDSCR = debtServiceCoverage(budget, rev);
  const newDSCR = debtServiceCoverage(budget, newRev);
  const nowAI = affordabilityIndex(classes, true, mhi);
  const newAI = affordabilityIndex(scaled, true, mhi);
  const now5k = cost5000(classes, true);
  const new5k = cost5000(scaled, true);
  const pct = m ? m - 1 : null;
  const already = pct != null && Math.abs(pct) < 0.0005;

  const apply = () => {
    onField('classes', scaleProposedRates(classes, m));
    setConfirm(false);
    buddyEvent('apply');
    pushToast(`Proposed rates ${pct >= 0 ? 'raised' : 'lowered'} ${Math.abs(pct * 100).toFixed(1)}% across all enabled classes. Ctrl+Z to undo.`, { kind: 'ok', duration: 6000 });
  };

  return (
    <div className="card rd-card">
      <div className="rd-head">
        <div>
          <div className="sh" style={{ marginBottom: 6, borderBottom: 'none', paddingBottom: 0 }}>Rate Design Assistant</div>
          <p className="rd-sub">Solve for the across-the-board change to <strong>proposed</strong> rates that reaches a target. Every base charge and block rate scales by the same percentage.</p>
        </div>
        <div className="seg" role="radiogroup" aria-label="Solve for">
          <button role="radio" aria-checked={mode === 'or'} className={mode === 'or' ? 'on' : ''} onClick={() => { setMode('or'); setTarget('1.25'); }}>Coverage ratio</button>
          <button role="radio" aria-checked={mode === 'dscr'} className={mode === 'dscr' ? 'on' : ''} disabled={!hasDebt} title={hasDebt ? '' : 'No debt in the proposed budget'} onClick={() => { setMode('dscr'); setTarget('1.25'); }}>Debt coverage</button>
        </div>
      </div>

      <div className="rd-target">
        <label className="flb" htmlFor="rd-target">Target {mode === 'dscr' ? 'DSCR' : 'budget coverage ratio'}</label>
        <div className="rd-target-row">
          {OR_PRESETS.map(v => (
            <button key={v} className={'chip' + (nv(target) === v ? ' on' : '')} onClick={() => setTarget(String(v))}>{v.toFixed(2)}</button>
          ))}
          <input id="rd-target" className="inp" type="number" step="0.01" min="0.5" max="3" value={target} onChange={e => setTarget(e.target.value)} style={{ width: 90 }} />
        </div>
        {mode === 'or' && (
          <div className="fhn">Revenue needed: {fmt.c(revenueRequirement(budget, t))}/mo against {fmt.c(exp)}/mo of proposed expenses.</div>
        )}
      </div>

      {!validTarget && <div className="fhn" style={{ color: 'var(--red)' }}>Enter a target between 0.01 and 5.00.</div>}
      {m != null && (
        <>
          <div className={'rd-answer' + (pct > 0 ? ' up' : pct < 0 ? ' down' : '')}>
            <div className="rd-answer-n">{already ? 'On target' : `${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%`}</div>
            <div className="rd-answer-l">
              {already
                ? 'Proposed rates already meet this target.'
                : `change to every proposed rate · ${fmt.signed(newRev - rev)}/month in revenue`}
            </div>
          </div>
          <div className="rd-grid">
            <Metric label="Budget coverage" from={fmt.ratio(nowOR)} to={fmt.ratio(newOR)} good={newOR >= 1.25} />
            {hasDebt && <Metric label="Debt coverage" from={fmt.ratio(nowDSCR)} to={fmt.ratio(newDSCR)} good={newDSCR >= 1.25} />}
            <Metric label="Bill @ 5,000 gal" from={fmt.cd(now5k)} to={fmt.cd(new5k)} />
            <Metric label="Affordability" from={fmt.pd(nowAI, 'N/A')} to={fmt.pd(newAI, 'N/A')} good={newAI == null ? null : newAI < 0.02} />
          </div>
          {newAI != null && newAI >= 0.025 && (
            <div className="al al-w" style={{ marginTop: 10, fontSize: 11.5 }}>
              At this target the 5,000-gallon bill exceeds 2.5% of monthly household income. Consider a lower target with
              a phase-in (Step 6), or shifting more cost to base charges for high-volume classes.
            </div>
          )}
          <div className="rd-actions">
            <button className="btn b-lime" disabled={already} onClick={() => setConfirm(true)}>Apply to proposed rates</button>
            <span className="fhn">Rounded to the cent. Undo with Ctrl+Z.</span>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmModal
          title={`Change every proposed rate by ${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%?`}
          message={`Every base charge and block rate on the Proposed side of each enabled class will be multiplied by ${m.toFixed(4)}. Current rates are not changed. You can undo this with Ctrl+Z.`}
          confirmLabel="Apply"
          destructive={false}
          onConfirm={apply}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

function Metric({ label, from, to, good }) {
  return (
    <div className="rd-metric">
      <div className="rd-metric-l">{label}</div>
      <div className="rd-metric-v">
        <span className="rd-from">{from}</span>
        <span aria-hidden="true" className="rd-arrow">→</span>
        <span className={'rd-to' + (good === true ? ' good' : good === false ? ' bad' : '')}>{to}</span>
      </div>
    </div>
  );
}
