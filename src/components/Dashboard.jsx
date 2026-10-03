import { useMemo, useState } from 'react';
import { fmt, totalRevenue, budgetTotal, operatingRatio } from '../lib/calc.js';
import { MapView } from './MapView.jsx';
import { makeSampleStudy } from '../lib/sample-study.js';
import { statusMeta } from '../lib/status.js';
import { stepCompletion } from '../lib/progress.js';
import { validateStudy, summarizeFindings } from '../lib/validate.js';
import { STEPS } from '../lib/constants.js';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const SORTS = {
  updated: { label: 'Recently edited', fn: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) },
  name: { label: 'Study name', fn: (a, b) => String(a.name || '').localeCompare(String(b.name || '')) },
  system: { label: 'System name', fn: (a, b) => String(a.systemInfo?.systemName || '').localeCompare(String(b.systemInfo?.systemName || '')) },
  progress: { label: 'Least complete', fn: (a, b) => a._done - b._done },
  issues: { label: 'Most issues', fn: (a, b) => (b._issues.error - a._issues.error) || (b._issues.total - a._issues.total) },
};

export function Dashboard({ studies, onSelect, onCreate, onLoadSample, onCreateFromKnown, onDuplicate, onShowTour }) {
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('updated');
  const list = useMemo(() => studies || [], [studies]);
  const mappedCount = list.filter(s => Number.isFinite(parseFloat(s.systemInfo?.latitude))).length;

  // Per-study facts for the cards and KPI tiles — computed once per change to
  // the study list, not on every keystroke in the search box.
  const enriched = useMemo(() => list.map(s => {
    const done = stepCompletion(s).filter(Boolean).length;
    const issues = summarizeFindings(validateStudy(s));
    const or = operatingRatio(totalRevenue(s.classes || [], true).monthly, budgetTotal(s.propBudget || {}).total);
    return { ...s, _done: done, _issues: issues, _or: or };
  }), [list]);

  const kpis = useMemo(() => {
    const complete = enriched.filter(s => s.status === 'complete').length;
    const active = enriched.filter(s => s.status === 'in-progress').length;
    const healthy = enriched.filter(s => s._or != null && s._or >= 1.25).length;
    const attention = enriched.filter(s => s._issues.error > 0).length;
    const counties = new Set(enriched.map(s => s.systemInfo?.county).filter(Boolean)).size;
    return [
      { icon: '📁', v: enriched.length, l: 'Rate studies', sub: `${counties} ${counties === 1 ? 'county' : 'counties'} served` },
      { icon: '⏳', v: active, l: 'In progress', sub: `${complete} complete` },
      { icon: '✅', v: healthy, l: 'Healthy proposals', sub: 'proposed budget coverage ≥ 1.25' },
      { icon: '⚠️', v: attention, l: 'Need attention', sub: 'have a data issue to fix', tone: attention ? 'warn' : '' },
    ];
  }, [enriched]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched
      .filter(s => status === 'all' || s.status === status)
      .filter(s => !needle || [s.name, s.systemInfo?.systemName, s.systemInfo?.pwsId, s.systemInfo?.county]
        .some(v => String(v || '').toLowerCase().includes(needle)))
      .sort(SORTS[sort].fn);
  }, [enriched, q, status, sort]);

  const loadSample = () => onLoadSample(makeSampleStudy());

  return (
    <div className="dash-wrap">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">{greeting()} · Office of Water Resource Management</div>
          <h1>Water Rate Studies</h1>
          <p>
            Help public water systems set rates that cover their true cost of service — and explain them to a board.
            Enter the system's numbers, let the tool solve for fair rates, and export a board-ready report.
          </p>
          <div className="hero-actions">
            <button className="btn b-lime btn-lg" onClick={onCreate}>+ New rate study</button>
            {list.length === 0 && (
              <button className="btn b-glass btn-lg" onClick={loadSample} title="Loads a fully-populated example study you can explore and modify">
                ✨ Load Sample Study
              </button>
            )}
            {onShowTour && <button className="btn b-glass btn-lg" onClick={onShowTour}>🧭 Take the tour</button>}
          </div>
        </div>
        <svg className="hero-art" viewBox="0 0 220 180" aria-hidden="true">
          <defs>
            <linearGradient id="wrs-drop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c4ef7a" />
              <stop offset="1" stopColor="#3e9e8e" />
            </linearGradient>
          </defs>
          <path d="M110 12 C110 12 52 86 52 121 a58 58 0 0 0 116 0 C168 86 110 12 110 12Z" fill="url(#wrs-drop)" />
          <path d="M84 120 a26 26 0 0 0 26 26" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".7" />
          <circle cx="38" cy="44" r="7" fill="#c4ef7a" opacity=".45" />
          <circle cx="190" cy="58" r="4" fill="#fff" opacity=".35" />
          <circle cx="184" cy="150" r="10" fill="#c4ef7a" opacity=".22" />
        </svg>
        <svg className="hero-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C 200 0 400 60 600 30 S 1000 0 1200 30 V60 H0Z" fill="rgba(255,255,255,.06)" />
          <path d="M0 42 C 200 18 400 66 600 42 S 1000 18 1200 42 V60 H0Z" fill="rgba(255,255,255,.08)" />
        </svg>
      </section>

      {list.length > 0 ? (
        <div className="kpi-row">
          {kpis.map(k => (
            <div key={k.l} className={'kpi ' + (k.tone || '')}>
              <div className="kpi-ic" aria-hidden="true">{k.icon}</div>
              <div>
                <div className="kpi-v">{k.v}</div>
                <div className="kpi-l">{k.l}</div>
                <div className="kpi-s">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="start-grid">
          <button className="start-card" onClick={onCreate}>
            <span className="start-ic" aria-hidden="true">📝</span>
            <strong>Start a new study</strong>
            <span>Begin with a blank study and follow the eight guided steps.</span>
          </button>
          <button className="start-card" onClick={loadSample}>
            <span className="start-ic" aria-hidden="true">🧪</span>
            <strong>Explore the sample</strong>
            <span>A complete, realistic study — every feature with the numbers already in.</span>
          </button>
          <button className="start-card" onClick={() => setView('map')}>
            <span className="start-ic" aria-hidden="true">🗺️</span>
            <strong>Start from the map</strong>
            <span>Pick a known water system and its details are filled in for you.</span>
          </button>
        </div>
      )}

      <div className="dash-toolbar">
        <div className="seg" role="tablist" aria-label="Dashboard view">
          <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>📋 Studies</button>
          <button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>🗺 Map</button>
        </div>
        {view === 'list' && list.length > 0 && (
          <div className="dash-filters">
            <input
              className="inp search"
              type="search"
              placeholder="Search name, system, PWS ID, county…"
              aria-label="Search studies"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <select className="sel" aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
            <select className="sel" aria-label="Sort studies" value={sort} onChange={e => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {view === 'map' ? (
        /* The map stays reachable with zero studies — its known-system markers
           are the natural starting point for a first study. */
        <>
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: 'var(--teal)', fontWeight: 600 }}>Choctaw Nation Water Systems</div>
            <div style={{ fontSize: 11.5, color: 'var(--mid)', marginTop: 2 }}>
              {list.length === 0
                ? 'Click a known water system marker to start a pre-filled study.'
                : `Showing ${mappedCount} of ${list.length} studies. Studies without coordinates won't appear — add an address in Step 1 and click "Geocode".`}
            </div>
          </div>
          <MapView studies={list} onSelect={onSelect} onCreateFromKnown={onCreateFromKnown} />
        </>
      ) : list.length > 0 && (
        shown.length === 0 ? (
          <div className="card empty-filter">
            <span>
              No studies match{q ? <> “<strong>{q}</strong>”</> : ''}{status !== 'all' ? ` with status ${statusMeta(status).label}` : ''}.
            </span>
            <button className="btn b-out btn-sm" onClick={() => { setQ(''); setStatus('all'); }}>Clear filters</button>
          </div>
        ) : (
          <div className="study-grid">
            {shown.map(s => {
              const meta = statusMeta(s.status);
              const pct = Math.round((s._done / STEPS.length) * 100);
              return (
                <article key={s.id} className="study-card">
                  <button className="study-card-main" onClick={() => onSelect(s.id)} aria-label={`Open ${s.name}`}>
                    <div className="study-card-top">
                      <span className={'bs ' + meta.badgeClass}>{meta.label}</span>
                      {s._issues.error > 0
                        ? <span className="health-chip bad">{s._issues.error} to fix</span>
                        : s._issues.total === 0 ? <span className="health-chip ok">✓ clear</span> : null}
                    </div>
                    <h3>{s.name}</h3>
                    <div className="study-card-sys">
                      {s.systemInfo?.systemName || 'No system named yet'}
                      {s.systemInfo?.pwsId && <span className="mono"> · {s.systemInfo.pwsId}</span>}
                    </div>
                    <div className="study-card-facts">
                      <div><span>County</span><strong>{s.systemInfo?.county || '—'}</strong></div>
                      <div><span>Year</span><strong>{s.systemInfo?.studyYear || '—'}</strong></div>
                      <div>
                        <span>Coverage</span>
                        <strong className={s._or == null ? '' : s._or >= 1.25 ? 'pos' : s._or < 1 ? 'neg' : ''}>{fmt.ratio(s._or)}</strong>
                      </div>
                    </div>
                    <div className="study-card-progress" title={`${s._done} of ${STEPS.length} steps have data`}>
                      <div className="ws-progress-track"><div className="ws-progress-fill" style={{ width: `${pct}%` }} /></div>
                      <span>{s._done}/{STEPS.length}</span>
                    </div>
                  </button>
                  <footer className="study-card-foot">
                    <span>Edited {fmt.date(s.updatedAt) || '—'}</span>
                    {onDuplicate && (
                      <button className="link-btn" onClick={() => onDuplicate(s.id)} title="Copy this study to model an alternative">⧉ Duplicate</button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
