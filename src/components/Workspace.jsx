import { useState, useEffect, useMemo, useRef } from 'react';
import { STEPS, stepTitle } from '../lib/constants.js';
import { fmt } from '../lib/calc.js';
import { statusMeta } from '../lib/status.js';
import { stepCompletion, needsBackupReminder } from '../lib/progress.js';
import { validateStudy, summarizeFindings } from '../lib/validate.js';
import { can } from '../platform/host.js';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Menu } from './Menu.jsx';
import { StepGuide } from './StepGuide.jsx';
import { keyEventIsOurs, isTypingTarget } from './keys.js';
import { Step1 } from '../steps/Step1.jsx';
import { Step2 } from '../steps/Step2.jsx';
import { Step3 } from '../steps/Step3.jsx';
import { Step4 } from '../steps/Step4.jsx';
import { Step5 } from '../steps/Step5.jsx';
import { Step6 } from '../steps/Step6.jsx';
import { Step7 } from '../steps/Step7.jsx';
import { Step8 } from '../steps/Step8.jsx';

// Compact "edited 3s ago" indicator that re-renders every 10s.
function SavedAgo({ iso }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  let label;
  if (seconds < 5) label = 'just now';
  else if (seconds < 60) label = `${seconds}s ago`;
  else if (seconds < 3600) label = `${Math.round(seconds / 60)}m ago`;
  else if (seconds < 86400) label = `${Math.round(seconds / 3600)}h ago`;
  else label = fmt.short(iso);
  return (
    <span className="save-ind saved" title={`Last change ${fmt.date(iso)}`}>
      <span className="save-dot" aria-hidden="true" />
      Edited {label}
    </span>
  );
}


export function Workspace({
  study, onUpdate, onDelete, onExport, onDuplicate, onRollForward,
  onUndo, onRedo, canUndo, canRedo, onShowShortcuts, onStepChange,
}) {
  const [step, setStep] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scrollRef = useRef(null);

  // field('foo', v) sets a single key; field({ a, b }) patches several
  // atomically. Uses the (id, patch) form of onUpdate so the merge happens
  // against the LATEST study, not this render's snapshot — which is what lets
  // long-running async writes (AI replies) land safely after other edits.
  const field = (kOrPatch, v) => {
    const patch = typeof kOrPatch === 'string' ? { [kOrPatch]: v } : kOrPatch;
    onUpdate(study.id, {
      ...patch,
      // Any real edit moves a draft to in-progress.
      status: patch.status ?? (study.status === 'draft' ? 'in-progress' : study.status),
    });
  };

  const goTo = (n) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));

  // A new step should start at the top, not wherever the last one was scrolled.
  useEffect(() => { scrollRef.current?.scrollTo?.({ top: 0 }); onStepChange?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alt+←/→ moves between steps; Alt+1…8 jumps. Never while a field has
  // focus: Alt+Arrow moves by word there, and on a Mac Option+digit types a
  // character (™, £, •) — and jumping steps would unmount the field mid-edit.
  const wsRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (!keyEventIsOurs(e, wsRef.current?.closest('.wrs-app')) || isTypingTarget(e.target)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setStep(s => Math.min(STEPS.length - 1, s + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(s => Math.max(0, s - 1)); }
      else if (/^Digit[1-8]$/.test(e.code)) { e.preventDefault(); setStep(Number(e.code.slice(5)) - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const completion = stepCompletion(study);
  const doneCount = completion.filter(Boolean).length;
  const findings = useMemo(() => validateStudy(study), [study]);
  const summary = summarizeFindings(findings);
  // Steps with a blocking data issue, so the stepper points at the step that
  // needs attention instead of making staff open all eight.
  const errorSteps = useMemo(() => {
    const set = new Set();
    for (const f of findings) if (f.severity === 'error') set.add(f.step);
    return set;
  }, [findings]);

  const stepProps = { study, onField: field };
  const meta = statusMeta(study.status);
  const prev = STEPS[step - 1];
  const next = STEPS[step + 1];

  return (
    <div className="ws" ref={wsRef}>
      <div className="ws-bar no-print">
        <div className="ws-id">
          <div className="ws-t" title={study.name}>{study.name}</div>
          <div className="ws-s">
            {study.systemInfo.systemName || 'No system named yet'}
            {study.systemInfo.pwsId ? <> · <span className="mono">{study.systemInfo.pwsId}</span></> : ''}
            {study.systemInfo.county ? ` · ${study.systemInfo.county} County` : ''}
            {study.systemInfo.studyYear ? ` · ${study.systemInfo.studyYear}` : ''}
          </div>
        </div>
        <div className="ws-actions">
          <SavedAgo iso={study.updatedAt} />
          <div className="btn-group" role="group" aria-label="History">
            <button className="btn b-out btn-sm icon-only" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo last change">↶</button>
            <button className="btn b-out btn-sm icon-only" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷</button>
          </div>
          {/* The backup reminder only matters where this browser holds the only
              copy; a host that persists studies has nothing to back up. */}
          {can('localPersistence') && needsBackupReminder(study) && (
            <button className="btn btn-sm b-warn" onClick={() => onExport?.(study.id)} title="This study lives only in this browser's storage. Export a .json backup regularly.">
              ⚠ Back up
            </button>
          )}
          <span className={'bs ' + meta.badgeClass}>{meta.label}</span>
          <Menu
            label="⋯"
            ariaLabel="Study actions"
            buttonClass="btn b-out btn-sm icon-only"
            items={[
              onDuplicate && { icon: '⧉', label: 'Duplicate study', hint: 'Model an alternative without touching this one', onClick: () => onDuplicate(study.id) },
              onRollForward && { icon: '⏭', label: "Start next year's study", hint: "This year's proposed rates become next year's current", onClick: () => onRollForward(study.id) },
              onExport && { icon: '⤓', label: 'Export study (.json)', hint: 'Backup or move to another computer', safe: true, onClick: () => onExport(study.id) },
              onShowShortcuts && { icon: '⌨', label: 'Keyboard shortcuts', safe: true, onClick: onShowShortcuts },
              onDelete && { divider: true },
              onDelete && { icon: '🗑', label: 'Delete study', danger: true, onClick: () => setConfirmDelete(true) },
            ]}
          />
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete this study?"
          message={
            <>
              <strong>{study.name}</strong>
              {study.systemInfo?.systemName ? <> — {study.systemInfo.systemName}</> : null}
              {study.systemInfo?.studyYear ? <> ({study.systemInfo.studyYear})</> : null}
              <br /><br />
              This permanently removes the study and all its rate, budget, and projection
              data. Export it first if you need a backup.
            </>
          }
          confirmLabel="Delete study"
          onConfirm={() => { setConfirmDelete(false); onDelete(study.id); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <nav className="stepper no-print" aria-label="Rate study steps">
        <div className="stepper-track" role="tablist">
          {STEPS.map(s => {
            const flagged = errorSteps.has(s.id);
            const done = completion[s.id];
            const state = step === s.id ? 'on' : flagged ? 'flag' : done ? 'done' : '';
            const hint = flagged ? 'needs attention' : done ? 'has data' : 'not started';
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={step === s.id}
                tabIndex={step === s.id ? 0 : -1}
                className={'stp ' + state}
                onClick={() => goTo(s.id)}
                onKeyDown={e => {
                  // Alt+Arrow is the window-level step shortcut; handling it
                  // here as well moved two steps per press.
                  if (e.altKey || e.ctrlKey || e.metaKey) return;
                  const n = e.key === 'ArrowRight' ? (step + 1) % STEPS.length
                    : e.key === 'ArrowLeft' ? (step + STEPS.length - 1) % STEPS.length
                    : e.key === 'Home' ? 0 : e.key === 'End' ? STEPS.length - 1 : null;
                  if (n !== null) { e.preventDefault(); goTo(n); e.currentTarget.parentElement.children[n]?.focus(); }
                }}
                title={`${stepTitle(s)} — ${hint}`}
              >
                <span className="stp-dot" aria-hidden="true">
                  {flagged ? '!' : done && step !== s.id ? '✓' : s.id + 1}
                </span>
                <span className="stp-label" aria-hidden="true">{s.short}</span>
                <span className="sr-only">{s.l} — {hint}</span>
              </button>
            );
          })}
        </div>
        <div className="stepper-meta">
          <div className="ws-progress-track" aria-hidden="true">
            <div className="ws-progress-fill" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
          <span className="ws-progress-lbl" role="status">{doneCount} of {STEPS.length} steps complete</span>
          {summary.total > 0 ? (
            <button
              className={'health-chip ' + (summary.error ? 'bad' : 'warn')}
              onClick={() => goTo(7)}
              title="Open the Data Check in the Final Report"
            >
              {summary.error ? `${summary.error} to fix` : `${summary.warn + summary.info} to review`}
            </button>
          ) : (
            <span className="health-chip ok">✓ Data check clear</span>
          )}
        </div>
      </nav>

      <div className="ws-sc" ref={scrollRef} role="tabpanel" aria-label={stepTitle(STEPS[step])}>
        <div className="ws-inner">
          <StepGuide step={step} />
          {step === 0 && <Step1 {...stepProps} />}
          {step === 1 && <Step2 {...stepProps} />}
          {step === 2 && <Step3 {...stepProps} />}
          {step === 3 && <Step4 {...stepProps} onGoToStep={goTo} />}
          {step === 4 && <Step5 {...stepProps} />}
          {step === 5 && <Step6 {...stepProps} />}
          {step === 6 && <Step7 {...stepProps} />}
          {step === 7 && <Step8 {...stepProps} onGoToStep={goTo} />}
        </div>
      </div>

      <div className="ws-nv no-print">
        <button className="btn b-out btn-sm nav-btn" onClick={() => goTo(step - 1)} disabled={!prev}>
          ← <span className="nav-lbl">{prev ? stepTitle(prev) : 'Previous'}</span>
        </button>
        <span className="ws-ni">
          Step {step + 1} of {STEPS.length}
          <span className="kbd-hint"> · <kbd>Alt</kbd>+<kbd>→</kbd></span>
        </span>
        <button className="btn b-teal btn-sm nav-btn" onClick={() => goTo(step + 1)} disabled={!next}>
          <span className="nav-lbl">{next ? stepTitle(next) : 'Next'}</span> →
        </button>
      </div>
    </div>
  );
}
