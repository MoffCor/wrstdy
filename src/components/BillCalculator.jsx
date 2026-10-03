import { useState } from 'react';
import { fmt, nv } from '../lib/calc.js';
import { billQuote } from '../lib/ratedesign.js';

const QUICK = [1000, 2000, 3500, 5000, 10000, 20000];

/**
 * "What will my bill be?" — current vs proposed for every enabled class at any
 * usage. The question every board member and customer asks first.
 */
export function BillCalculator({ classes }) {
  const [gal, setGal] = useState('5000');
  const rows = billQuote(classes || [], gal);
  if (rows.length === 0) return null;
  return (
    <div className="card bill-calc">
      <div className="sh">Bill Calculator</div>
      <div className="bill-calc-input">
        <label className="flb" htmlFor="bill-gal">Monthly usage (gallons)</label>
        <div className="rd-target-row">
          <input id="bill-gal" className="inp" type="number" min="0" step="100" value={gal} onChange={e => setGal(e.target.value)} style={{ width: 130 }} />
          {QUICK.map(q => (
            <button key={q} className={'chip' + (nv(gal) === q ? ' on' : '')} onClick={() => setGal(String(q))}>{q >= 1000 ? `${q / 1000}k` : q}</button>
          ))}
        </div>
      </div>
      <div className="tbl-scroll">
        <table className="dt" style={{ marginTop: 10 }}>
          <caption className="sr-only">Monthly bill at {fmt.n(gal)} gallons, current versus proposed, by customer class</caption>
          <thead>
            <tr><th>Class</th><th style={{ textAlign: 'right' }}>Current</th><th style={{ textAlign: 'right' }}>Proposed</th><th style={{ textAlign: 'right' }}>Change</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td style={{ textAlign: 'right' }} className="num">{fmt.c(r.cur)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">{fmt.c(r.prop)}</td>
                <td style={{ textAlign: 'right' }} className={'num ' + (r.delta > 0.005 ? 'neg' : r.delta < -0.005 ? 'pos' : 'neutral')}>
                  {Math.abs(r.delta) < 0.005 ? '—' : `${fmt.signed(r.delta)} (${fmt.pctOf(r.delta, r.cur)})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
