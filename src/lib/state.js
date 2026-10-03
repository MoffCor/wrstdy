import { SK } from './constants.js';
import { getHost, webHost } from '../platform/host.js';

export const defaultTiers = () => [
  { gal: 1000, rate: '' }, { gal: 2000, rate: '' }, { gal: 3000, rate: '' },
  { gal: 4000, rate: '' }, { gal: 5000, rate: '' }, { gal: 6000, rate: '' }
];

export const mkClass = (id, name, enabled = false) => ({
  id, name, enabled,
  // Optional customer usage distribution: how many customers fall at each
  // monthly-usage level. Shared by the Current and Proposed sides (usage is a
  // property of the customers, not the rates). When present, revenue is
  // computed bracket-by-bracket instead of from the class average.
  usage: [],
  cur: { customers: '', minCharge: '', tiers: defaultTiers() },
  prop: { customers: '', minCharge: '', tiers: defaultTiers() }
});

export const defaultClasses = () => [
  { ...mkClass('res', 'Residential Water', true) },
  mkClass('pas', 'Pasture Tap'),
  mkClass('com', 'Commercial Users'),
  mkClass('who', 'Wholesale'),
  mkClass('c5', ''), mkClass('c6', ''), mkClass('c7', '')
];

export const defBudget = () => ({
  emp: { salaries: '', healthIns: '', retirement: '', uniforms: '', workersComp: '', contractLabor: '', other1: '', other2: '' },
  ofc: { rent: '', electric: '', naturalGas: '', phone: '', equipment: '', supplies: '', audit: '', other1: '', other2: '' },
  plt: { tools: '', chemicals: '', utilities: '', treatment: '', other: '' },
  dst: { tools: '', parts: '', chemicals: '', utilities: '', other1: '', other2: '' },
  veh: { maint: '', fuel: '', insurance: '', other1: '', other2: '' },
  loa: { newLoan: '', owrb: '', bank: '', other: '' },
  oth: { depreciation: '', longRange: '', insurance: '', membership: '', purchasedWater: '', attorney: '', engineer: '', other: '' }
});

const uuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const defaultForecast = () => ({
  inflationRate: '3', revenueGrowth: '0', accountGrowth: '0',
  beginFundBalance: '0', targetFundBalance: '5000',
  debtService: ['', '', '', '', ''],
  knownItems: [{ label: '', vals: ['', '', '', '', ''] }]
});

const defaultSystemInfo = (yr = String(new Date().getFullYear())) => ({
  systemName: '', pwsId: '', county: '', studyYear: yr,
  populationServed: '', sourceType: 'groundwater', systemType: 'community',
  ownerContact: '', contactEmail: '', contactPhone: '',
  address: '', latitude: null, longitude: null,
  waterBodySource: '', // e.g. "Hugo Lake", "Antlers Aquifer"
});

const normalizeSide = (side = {}) => ({
  customers: side.customers ?? '',
  gallonsSold: side.gallonsSold ?? '',
  minCharge: side.minCharge ?? '',
  tiers: Array.isArray(side.tiers) && side.tiers.length > 0
    ? side.tiers.map((t, i) => ({ gal: t?.gal ?? 1000 * (i + 1), rate: t?.rate ?? '', ...(t?.label ? { label: t.label } : {}) }))
    : defaultTiers(),
});

const normalizeUsage = (usage) =>
  Array.isArray(usage)
    ? usage.filter(b => b && typeof b === 'object').map(b => ({
      customers: b.customers ?? '',
      gallons: b.gallons ?? '',
      note: b.note ?? '',
    }))
    : [];

const normalizeBudget = (budget = {}) => {
  const base = defBudget();
  return Object.fromEntries(
    Object.entries(base).map(([section, fields]) => [
      section,
      { ...fields, ...(budget?.[section] && typeof budget[section] === 'object' ? budget[section] : {}) },
    ]),
  );
};

const normalizeForecast = (forecast = {}) => {
  const base = defaultForecast();
  const knownItems = Array.isArray(forecast?.knownItems) && forecast.knownItems.length > 0
    ? forecast.knownItems.map(item => ({
      label: item?.label ?? '',
      vals: Array.from({ length: 5 }, (_, i) => item?.vals?.[i] ?? ''),
    }))
    : base.knownItems;
  return {
    ...base,
    ...(forecast && typeof forecast === 'object' ? forecast : {}),
    debtService: Array.from({ length: 5 }, (_, i) => forecast?.debtService?.[i] ?? ''),
    knownItems,
  };
};

const normalizeClasses = (classes) => {
  const base = defaultClasses();
  const incoming = Array.isArray(classes) ? classes : [];
  const byId = new Map(incoming.filter(Boolean).map(c => [c.id, c]));
  const merged = base.map(def => {
    const c = byId.get(def.id) || {};
    return {
      ...def,
      ...c,
      id: c.id || def.id,
      name: c.name ?? def.name,
      enabled: Boolean(c.enabled ?? def.enabled),
      usage: normalizeUsage(c.usage),
      cur: normalizeSide(c.cur || def.cur),
      prop: normalizeSide(c.prop || def.prop),
    };
  });
  for (const c of incoming) {
    if (!c?.id || byId.has(c.id) && base.some(def => def.id === c.id)) continue;
    merged.push({
      ...mkClass(c.id, c.name || c.id, Boolean(c.enabled)),
      ...c,
      usage: normalizeUsage(c.usage),
      cur: normalizeSide(c.cur),
      prop: normalizeSide(c.prop),
    });
  }
  return merged;
};

export function normalizeStudy(study = {}) {
  const yr = String(new Date().getFullYear());
  const now = new Date().toISOString();
  const safeStudy = study && typeof study === 'object' ? study : {};
  return {
    ...safeStudy,
    id: safeStudy.id || uuid(),
    name: safeStudy.name || `Rate Study ${yr}`,
    status: safeStudy.status || 'draft',
    createdAt: safeStudy.createdAt || now,
    updatedAt: safeStudy.updatedAt || safeStudy.createdAt || now,
    systemInfo: { ...defaultSystemInfo(yr), ...(safeStudy.systemInfo || {}) },
    demographics: { medianMonthlyHHI: '', effectiveDate: '', ...(safeStudy.demographics || {}) },
    classes: normalizeClasses(safeStudy.classes),
    curBudget: normalizeBudget(safeStudy.curBudget),
    propBudget: normalizeBudget(safeStudy.propBudget),
    forecast: normalizeForecast(safeStudy.forecast),
    scenarios: Array.isArray(safeStudy.scenarios) ? safeStudy.scenarios : [],
    activeScenario: safeStudy.activeScenario || undefined,
    aiAnalysis: { content: '', generatedAt: '', ...(safeStudy.aiAnalysis || {}) },
    aiHistory: Array.isArray(safeStudy.aiHistory) ? safeStudy.aiHistory : [],
    reportNotes: safeStudy.reportNotes || '',
    // Set when "Export Study (.json)" is used for this study — drives a
    // reminder banner when real data exists but hasn't been backed up since
    // (localStorage is this tool's only persistence; clearing browser data
    // or switching machines without exporting first loses the study).
    lastExportedAt: safeStudy.lastExportedAt || null,
  };
}

export function newStudy(name = '') {
  return normalizeStudy({ name });
}

const deepClone = (v) => JSON.parse(JSON.stringify(v ?? null));

/**
 * Copy a study under a new id — for "what if" variants of the same system.
 * The copy starts as a draft with no analysis history (the analysis described
 * the original's numbers, not the copy's) and no backup timestamp.
 */
export function duplicateStudy(study, { name } = {}) {
  const copy = deepClone(study) || {};
  const now = new Date().toISOString();
  return normalizeStudy({
    ...copy,
    id: undefined,
    name: name || `${copy.name || 'Rate Study'} (Copy)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    aiHistory: [],
    aiAnalysis: { content: '', generatedAt: '' },
  });
}

/**
 * Start next year's study from this one.
 *
 * Rate studies are annual. Next year, the rates this study PROPOSED are the
 * rates the system CHARGES, and this year's proposed budget is next year's
 * starting point. Rolling forward copies proposed → current for every class
 * and for the budget, seeds the new proposed side from the same values (ready
 * to edit), bumps the study year, and advances the forecast: the fund balance
 * projected for the end of year 1 is a reasonable opening balance for the new
 * study, but it is an estimate, so it is flagged for staff to replace with the
 * audited figure.
 */
export function rollForwardStudy(study, { fy1EndingBalance } = {}) {
  const src = normalizeStudy(deepClone(study) || {});
  const year = parseInt(src.systemInfo?.studyYear, 10);
  const nextYear = Number.isFinite(year) ? year + 1 : new Date().getFullYear() + 1;
  const classes = src.classes.map(c => ({
    ...c,
    cur: deepClone(c.prop),
    prop: deepClone(c.prop),
  }));
  const forecast = {
    ...src.forecast,
    beginFundBalance: Number.isFinite(fy1EndingBalance)
      ? String(Math.round(fy1EndingBalance))
      : src.forecast.beginFundBalance,
    // Year 1's scheduled debt and one-time items are now history.
    debtService: [...src.forecast.debtService.slice(1), ''],
    knownItems: src.forecast.knownItems.map(it => ({
      label: it.label,
      vals: [...(it.vals || []).slice(1), ''],
    })),
  };
  const now = new Date().toISOString();
  return normalizeStudy({
    ...src,
    id: undefined,
    name: `${src.systemInfo?.systemName || src.name || 'Rate Study'} — Rate Study ${nextYear}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    systemInfo: { ...src.systemInfo, studyYear: String(nextYear) },
    demographics: { ...src.demographics, effectiveDate: '' },
    classes,
    curBudget: deepClone(src.propBudget),
    propBudget: deepClone(src.propBudget),
    forecast,
    activeScenario: undefined,
    aiHistory: [],
    aiAnalysis: { content: '', generatedAt: '' },
    reportNotes: '',
    rolledForwardFrom: { id: src.id, name: src.name, at: now, openingBalanceEstimated: Number.isFinite(fy1EndingBalance) },
  });
}

// ─── Undo history ────────────────────────────────────────────────────────────
// Edits arrive per keystroke. Recording each one would make Ctrl+Z undo a
// single character; coalescing edits that land within UNDO_COALESCE_MS of the
// previous one makes an undo step correspond to "what I just typed into that
// field" — the unit people expect.
export const UNDO_LIMIT = 60;
export const UNDO_COALESCE_MS = 900;

/**
 * Record `snapshot` (the study BEFORE an edit) on an undo stack.
 * @returns the new stack (the input is not mutated)
 */
export function pushUndo(stack = [], snapshot, at = Date.now(), lastAt = 0) {
  if (!snapshot) return stack;
  // Within the coalescing window the earlier snapshot already represents the
  // state before this burst of typing — keep it, drop this one.
  if (stack.length > 0 && at - lastAt < UNDO_COALESCE_MS) return stack;
  const next = [...stack, snapshot];
  return next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
}

// The Step 7 conversation is stored on the study and travels with it — into
// localStorage, into the .json export, and (in Power Apps) into the SharePoint
// payload. Each analysis reply runs 3–8 KB, so an unbounded history is the one
// field that can push a study past a storage ceiling on its own. Keep the first
// message (the full data dump the model needs as context) plus the most recent
// exchanges.
export const MAX_AI_HISTORY = 24;

export function trimAiHistory(history) {
  const safe = Array.isArray(history) ? history : [];
  if (safe.length <= MAX_AI_HISTORY) return safe;
  return [safe[0], ...safe.slice(-(MAX_AI_HISTORY - 1))];
}

// Resolve a study patch against the CURRENT study.
//
// A patch value may be a function, which receives the current value of that key
// and returns the new one. This exists because every async writer in the app —
// the AI helpers in Steps 1, 2 and 3, the analysis in Step 7 — builds its patch
// from objects captured *before* an await that takes seconds. A plain object
// patch replaces `systemInfo` wholesale with that stale snapshot, silently
// reverting anything the user typed into another field while the request was in
// flight. Passing `(cur) => ({ ...cur, ...changes })` merges against whatever
// the study actually holds at commit time instead.
export function resolvePatch(current = {}, patch = {}) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] = typeof value === 'function' ? value(current[key]) : value;
  }
  return out;
}

// ─── Persistence ─────────────────────────────────────────────────────────────
// The storage mechanism belongs to the host: the standalone web build keeps
// studies in this browser's localStorage, while the Power Apps code component
// hands them to the canvas app (which writes them to SharePoint). Both go
// through loadDB/saveDB so nothing above this line has to know the difference.

const localLoad = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SK));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const localSave = (studies) => {
  try {
    localStorage.setItem(SK, JSON.stringify(studies));
    return true;
  } catch (err) {
    // Re-thrown so saveDB can report the specific failure (quota, opaque
    // origin, storage disabled) instead of a bare `false`.
    throw err;
  }
};

// Register the browser implementation on the default host. Done here rather
// than inside platform/host.js so that module stays free of app-schema
// knowledge (the storage key and the normalize-on-read migration).
webHost.loadStudies = localLoad;
webHost.saveStudies = localSave;

export const loadDB = () => {
  const host = getHost();
  try {
    const raw = host.loadStudies ? host.loadStudies() : [];
    return Array.isArray(raw) ? raw.map(normalizeStudy) : [];
  } catch (err) {
    console.error('loadStudies failed', err);
    return [];
  }
};

// Save listeners — UI components subscribe to surface persistence failures
// (quota exceeded, opaque origin, disabled storage, a rejected Power Apps
// write) instead of silently dropping data.
const saveListeners = new Set();
export function onSaveStatus(fn) { saveListeners.add(fn); return () => saveListeners.delete(fn); }
function notify(status, err) { saveListeners.forEach(fn => { try { fn(status, err); } catch { /* ignore */ } }); }

export const saveDB = (s) => {
  const host = getHost();
  try {
    if (host.saveStudies) host.saveStudies(s);
    notify('ok', null);
    return true;
  } catch (err) {
    notify('error', err);
    return false;
  }
};
