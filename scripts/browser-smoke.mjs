#!/usr/bin/env node
/**
 * End-to-end smoke test in a real browser.
 *
 * `npm test` covers the calculations, which is where the money is — but three
 * classes of defect only show up once the app is actually rendered, and each
 * one has bitten this project:
 *
 *   1. The standalone app failing to mount, or throwing on a step.
 *   2. The code component leaking its styles into the page hosting it, or
 *      touching localStorage (which the component framework forbids).
 *   3. The Power Apps bridge echoing its own output back into itself, or
 *      emitting a "save" when a user merely opened a study — which would
 *      patch SharePoint and add a payload version on every view.
 *
 * Playwright is not a dependency of this project (it is ~200 MB and CI does
 * not need it for the unit tests). Install it when you want to run this:
 *
 *     npm i -D playwright && npx playwright install chromium
 *     npm run build && npm run build:pcf
 *     npm run test:browser
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
const CONTROL_BUNDLE = path.join(root, 'pcf/out/controls/WaterRateStudyTool/bundle.js');
const PCF_BUNDLE = path.join(root, 'pcf/WaterRateStudyTool/app/wrs-app.js');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('playwright is not installed — skipping browser smoke test.');
  console.log('  npm i -D playwright && npx playwright install chromium');
  process.exit(0);
}

for (const [label, p] of [['dist/', DIST], ['the PCF app bundle', PCF_BUNDLE]]) {
  if (!fs.existsSync(p)) {
    console.error(`✗ ${label} is missing — run "npm run build && npm run build:pcf" first.`);
    process.exit(1);
  }
}

const failures = [];
const check = (label, actual, expected) => {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — got ${JSON.stringify(actual)}`}`);
  if (!ok) failures.push(label);
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };

// A stand-in for a Power Apps screen: unrelated chrome around a sized
// container. If the component's CSS still leaked, this is what would break.
const HOST_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font-family: "Segoe UI", sans-serif; background: #faf9f8 }
  .probe { border: 3px dashed #d13438; padding: 8px }
  #ctl { width: 1200px; height: 760px }
</style></head><body>
  <div class="probe" id="probe">Host card</div><div id="ctl"></div>
</body></html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/host') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(HOST_PAGE); return; }
  if (url === '/control-bundle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); fs.createReadStream(CONTROL_BUNDLE).pipe(res); return; }
  if (url === '/wrs-app.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); fs.createReadStream(PCF_BUNDLE).pipe(res); return; }
  let file = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(4173, r));

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

const STEPS = ['System Info', 'Cust. Classes', 'Budget', 'Financial Metrics', '5-Year Projection', 'Scenarios', 'AI Analysis', 'Final Report'];

// ── Standalone application ──────────────────────────────────────────────────
console.log('\nStandalone build');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.wrs-app', { timeout: 15000 });
  check('mounts into the scoped .wrs-app wrapper', true, true);

  // First run opens the welcome tour; it must be skippable and stay skipped.
  await page.waitForSelector('.tour-card', { timeout: 5000 });
  check('first run shows the welcome tour', await page.locator('.tour-card').count(), 1);
  check('the tour is hosted by Drip', await page.locator('.tour-card .tour-buddy svg').count(), 1);
  await page.getByRole('button', { name: 'Next →' }).click();
  check('tour advances', await page.locator('.tour-dot.on').count(), 1);
  // Stop 2 spotlights the real "New rate study" buttons, unblurred.
  await page.waitForTimeout(600);
  const spot = await page.locator('.tour-spot').boundingBox();
  const target = await page.locator('.hero-actions').boundingBox();
  check('tour spotlights the control it describes',
    !!spot && spot.x <= target.x && spot.y <= target.y && spot.x + spot.width >= target.x + target.width, true);
  await page.getByRole('button', { name: 'Skip tour' }).click();
  check('tour closes on skip', await page.locator('.tour-card').count(), 0);

  // Drip, the guide, is on by default and must be dismissable from the keyboard.
  check('Drip is on the dashboard', await page.locator('.buddy').count(), 1);
  // He arrives through his door: it opens, he steps out, it closes.
  await page.waitForSelector('.buddy-door.door-open', { timeout: 3000 });
  check('Drip enters through a door', true, true);
  await page.waitForSelector('.buddy-door.door-hidden', { timeout: 5000 });
  await page.waitForSelector('.buddy:not(.away)', { timeout: 5000 });
  await page.locator('.buddy-fig').click();
  await page.waitForTimeout(300);
  check('clicking Drip tells a joke', await page.locator('.buddy-bubble.joke').count(), 1);
  await page.keyboard.press('b');
  await page.waitForSelector('.buddy-door.door-open', { timeout: 3000 });
  check('Drip leaves through the door', true, true);
  await page.waitForSelector('.buddy', { state: 'detached', timeout: 8000 });
  check('B hides Drip', await page.locator('.buddy').count(), 0);
  await page.keyboard.press('b');
  await page.waitForTimeout(200);
  check('B brings Drip back', await page.locator('.buddy').count(), 1);

  await page.getByRole('button', { name: /Load Sample Study/i }).click();
  await page.waitForSelector('.stepper', { timeout: 10000 });
  check('Drip follows into the workspace', await page.locator('.buddy.raised').count(), 1);
  // Ask Drip: "What's next?" gives one concrete next step.
  if (!(await page.locator('.buddy-bubble').count())) { await page.locator('.buddy-fig').click(); await page.waitForTimeout(300); }
  await page.getByRole('button', { name: /What's next/ }).click();
  await page.waitForTimeout(300);
  check("Drip answers what's next", /^(Next|The numbers are all in)/.test(await page.locator('.buddy-bubble .sr-only').textContent()), true);
  // The showreel sends him off; a click on him calls it off and he heads home.
  await page.getByRole('button', { name: /What can you do/ }).click();
  check('showreel sends Drip off on a tour',
    await page.waitForSelector('.buddy:not(.home)', { timeout: 8000 }).then(() => true, () => false), true);
  await page.locator('.buddy-fig').dispatchEvent('click');
  await page.waitForSelector('.buddy.home', { timeout: 12000 });
  await page.waitForTimeout(800);
  check('a click ends the showreel and packs up his gear', await page.locator('.buddy-gear').count(), 0);
  // The actions menu must open above the stepper, and Duplicate must work.
  await page.getByRole('button', { name: 'Study actions' }).click();
  await page.getByRole('menuitem', { name: /Duplicate study/ }).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  check('duplicate opens a copy', /\(Copy\)/.test(await page.locator('.ws-t').textContent()), true);
  if (process.env.WRS_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.WRS_SCREENSHOT_DIR, { recursive: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(process.env.WRS_SCREENSHOT_DIR, 'workspace.png') });
  }

  for (const step of STEPS) {
    await page.getByRole('tab', { name: new RegExp(step.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
    await page.waitForTimeout(180);
    const heading = await page.locator('.ws-sc h2').first().textContent().catch(() => null);
    check(`step renders: ${step}`, Boolean(heading), true);
  }

  await page.getByRole('tab', { name: /Financial Metrics/ }).click();
  await page.waitForTimeout(250);
  const scorecard = await page.locator('.dt tbody tr').first().textContent();
  // The sample is tuned so current rates fail and proposed rates pass — if
  // that inverts, the sample study has drifted.
  check('sample shows current below target, proposed healthy',
    /Below Target/.test(scorecard) && /Healthy/.test(scorecard), true);

  await page.getByRole('tab', { name: /5-Year Projection/ }).click();
  await page.waitForTimeout(400);
  const projectionText = await page.locator('.ws-sc').innerText();
  check('no "$-1,234" malformed negatives', /\$-[\d,]/.test(projectionText), false);

  // "Tour this step" spotlights the step's own sections.
  await page.getByRole('tab', { name: /Financial Metrics/ }).click();
  await page.waitForTimeout(250);
  await page.locator('.step-guide-tour').click();
  await page.waitForSelector('.tour-card', { timeout: 3000 });
  await page.waitForTimeout(600);
  check('step tour spotlights a section of this step', await page.locator('.tour-spot').count(), 1);
  check('step tour opens on a Step 4 section', /Read this first|The scorecard/.test(await page.locator('.tour-card h3').textContent()), true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Rate design assistant: solve for a 1.50 operating ratio and apply it.
  await page.getByRole('tab', { name: /Financial Metrics/ }).click();
  await page.waitForTimeout(250);
  await page.locator('.rd-card .chip', { hasText: '1.50' }).click();
  await page.getByRole('button', { name: 'Apply to proposed rates' }).click();
  await page.locator('.modal').getByRole('button').last().click();
  await page.waitForTimeout(400);
  const orAfter = await page.locator('.rd-card .rd-to').first().textContent();
  check('rate design hits the target ratio', Math.abs(parseFloat(orAfter) - 1.5) < 0.02, true);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const orUndone = await page.locator('.rd-card .rd-answer-n').textContent();
  check('undo restores the previous rates', /[1-9]/.test(orUndone), true);

  await page.getByRole('tab', { name: /Cust\. Classes/ }).click();
  await page.waitForTimeout(250);
  check('bill calculator renders', await page.locator('.bill-calc tbody tr').count(), n => n > 0);

  // Ctrl+Z inside a field is that field's undo, never the study's.
  await page.locator('.toast', { hasText: 'Undone' }).waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  const gal = page.locator('.bill-calc-input input');
  await gal.fill('3500');
  await gal.press('Control+z');
  await page.waitForTimeout(200);
  check('Ctrl+Z in a field does not undo the study', await page.locator('.toast', { hasText: 'Undone' }).count(), 0);

  // Alt+→ from a focused step tab moves exactly one step.
  await page.getByRole('tab', { name: /Budget/ }).click();
  await page.keyboard.press('Alt+ArrowRight');
  await page.waitForTimeout(200);
  check('Alt+→ moves one step', await page.getByRole('tab', { name: /Financial Metrics/ }).getAttribute('aria-selected'), 'true');

  // Dragging Drip tracks the pointer at the default (zoomed) text size.
  // (Wait out any coffee run — he may be off through his door.)
  await page.waitForSelector('.buddy:not(.away)', { timeout: 15000 });
  await page.waitForSelector('.buddy-door.door-hidden', { timeout: 15000 });
  const fig = page.locator('.buddy-fig');
  const b0 = await fig.boundingBox();
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(b0.x + b0.width / 2 - i * 20, b0.y + b0.height / 2 - i * 15);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const b1 = await fig.boundingBox();
  check('Drip follows a drag 1:1 at the default zoom', Math.round(b0.x - b1.x), d => Math.abs(d - 200) < 12);
  check('Drip can be dragged up the screen too', Math.round(b0.y - b1.y), d => Math.abs(d - 150) < 12);

  await page.getByRole('tab', { name: /5-Year Projection/ }).click();
  await page.waitForTimeout(300);
  const inflation = page.locator('.ws-sc input[type=number]').first();
  await inflation.fill('');
  await page.waitForTimeout(200);
  check('a cleared forecast field stays cleared', await inflation.inputValue(), '');
  await inflation.fill('3');

  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForTimeout(300);
  check('narrow layout below 820px', await page.locator('.wrs-app.narrow').count(), 1);
  await page.setViewportSize({ width: 460, height: 900 });
  await page.waitForTimeout(300);
  check('single-column layout below 520px', await page.locator('.wrs-app.xnarrow').count(), 1);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.wrs-app');
  check('study survives a reload', await page.locator('.sb-nm').count(), n => n > 0);

  check('no console errors', errors.filter(e => !/favicon|DevTools/i.test(e)).length, 0);
  await page.close();
}

// ── Power Apps code component ───────────────────────────────────────────────
console.log('\nPower Apps code component');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/host', { waitUntil: 'domcontentloaded' });

  const study = {
    id: 'study-abc',
    name: 'Antlers PWA — Rate Study 2026',
    systemInfo: { systemName: 'Antlers Public Works Authority', pwsId: 'OK3000101', county: 'Pushmataha', studyYear: '2026' },
  };

  const mounted = await page.evaluate(async ({ study }) => {
    const mod = await import('/wrs-app.js');
    window.__saves = 0;
    window.__files = [];
    window.__app = mod.mountWaterRateStudy(document.getElementById('ctl'), {
      studiesJson: JSON.stringify(study),
      multiStudy: false,
      onStudiesChanged: (s) => { window.__saves++; window.__lastOut = JSON.stringify(s); },
      onFileReady: (f) => window.__files.push(f),
    });
    await new Promise(r => setTimeout(r, 900));
    return {
      exports: Object.keys(mod).sort().join(','),
      mounted: !!document.querySelector('#ctl .wrs-app'),
      header: !!document.querySelector('#ctl .hdr'),
      sidebar: !!document.querySelector('#ctl .sb'),
      title: document.querySelector('#ctl .ws-t')?.textContent ?? null,
      probeBorder: getComputedStyle(document.getElementById('probe')).borderStyle,
      probeFont: getComputedStyle(document.getElementById('probe')).fontFamily,
      bodyOverflow: getComputedStyle(document.body).overflow,
      styleTags: document.querySelectorAll('#wrs-pcf-styles').length,
      storageKeys: Object.keys(localStorage).length,
    };
  }, { study });

  check('exports the mount API', mounted.exports, 'default,mountWaterRateStudy,parseStudiesJson');
  check('mounts into the host container', mounted.mounted, true);
  check('single-study mode hides the app chrome', !mounted.header && !mounted.sidebar, true);
  check('loads the study from StudiesJson', mounted.title, study.name);
  check('does not restyle the host page', mounted.probeBorder, 'dashed');
  check('does not override the host font', /Segoe UI/.test(mounted.probeFont), true);
  check('does not lock host page scrolling', mounted.bodyOverflow, 'visible');
  check('injects its stylesheet exactly once', mounted.styleTags, 1);
  check('uses no web storage', mounted.storageKeys, 0);

  await page.locator('#ctl input').first().fill('Antlers PWA — Rate Study 2026 (edited)');
  await page.waitForTimeout(900);
  check('an edit emits a save', await page.evaluate(() => window.__saves), n => n >= 1);

  await page.getByRole('tab', { name: /Cust\. Classes/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Export CSV/ }).click();
  await page.waitForTimeout(600);
  const files = await page.evaluate(() => window.__files.map(f => ({ name: f.filename, mime: f.mimeType, size: f.sizeBytes, b64: f.base64.length > 0 })));
  check('an export is handed back as base64, not downloaded',
    files.length === 1 && files[0].b64 && /\.csv$/.test(files[0].name), true);

  const reopenSaves = await page.evaluate(async () => {
    const payload = window.__lastOut;
    window.__app.destroy();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('ctl').innerHTML = '';
    const mod = await import('/wrs-app.js');
    let saves = 0;
    window.__app = mod.mountWaterRateStudy(document.getElementById('ctl'), {
      studiesJson: payload,
      onStudiesChanged: () => { saves++; },
    });
    await new Promise(r => setTimeout(r, 1200));
    return saves;
  });
  check('re-opening an unchanged study emits nothing', reopenSaves, 0);

  const pushResults = await page.evaluate(() => {
    const other = JSON.stringify([{ id: 'other', name: 'Broken Bow RWD — 2026', systemInfo: { systemName: 'Broken Bow RWD' } }]);
    return {
      applied: window.__app.setStudiesJson(other),
      echoed: window.__app.setStudiesJson(other),
    };
  });
  await page.waitForTimeout(500);
  check('a new payload from the host is applied', pushResults.applied, true);
  check('the same payload again is a no-op', pushResults.echoed, false);
  check('the pushed study is showing', await page.locator('#ctl .ws-t').textContent(), 'Broken Bow RWD — 2026');

  await page.getByRole('tab', { name: /Final Report/ }).click();
  await page.waitForTimeout(400);
  check('no Print button (host page printing is meaningless)', await page.getByRole('button', { name: /Print/ }).count(), 0);
  check('no local-backup prompt (the host persists)', await page.getByRole('button', { name: /Not backed up/ }).count(), 0);

  await page.evaluate(() => window.__app.destroy());
  await page.waitForTimeout(300);
  check('destroy() unmounts cleanly', await page.evaluate(() => document.querySelectorAll('#ctl .wrs-app').length), 0);
  check('no console errors', errors.filter(e => !/favicon|DevTools/i.test(e)).length, 0);
  await page.close();
}

// Exercise the actual compiled PCF wrapper and its PDF/Word dependencies.
if (fs.existsSync(CONTROL_BUNDLE)) {
  console.log('\nCompiled PCF control');
  const { makeSampleStudy } = await import('../src/lib/sample-study.js');
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:4173/host');
  await page.addScriptTag({ url: '/control-bundle.js' });
  await page.evaluate(study => {
    const ctl = new window.ChoctawNationOWRM.WaterRateStudyTool();
    const context = {
      mode: { allocatedHeight: 760, allocatedWidth: 1200, trackContainerResize: () => {} },
      parameters: { StudiesJson: { raw: JSON.stringify(study) }, Mode: { raw: 'single' }, ReadOnly: { raw: false } },
    };
    window.__control = ctl; window.__context = context; window.__events = [];
    ctl.init(context, () => window.__events.push(ctl.getOutputs()), {}, document.getElementById('ctl'));
  }, makeSampleStudy());
  await page.waitForSelector('#ctl .stepper');
  check('compiled wrapper honors initial height', await page.locator('#ctl').evaluate(el => el.style.height), '760px');
  await page.waitForTimeout(600);
  check('compiled wrapper does not save on open', await page.evaluate(() => window.__events.length), 0);
  check('compiled wrapper shows the step guide', await page.locator('#ctl .step-guide').count(), 1);
  check('Drip stays off by default inside a canvas app', await page.locator('#ctl .buddy').count(), 0);
  if (process.env.WRS_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.WRS_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.WRS_SCREENSHOT_DIR, 'water-rate-study-desktop.png') });
  }
  await page.evaluate(() => { window.__context.parameters.ReadOnly.raw = true; window.__control.updateView(window.__context); });
  check('read-only disables editing', await page.locator('#ctl input').first().isDisabled(), true);
  await page.getByRole('tab', { name: /Budget/ }).click();
  check('reviewer can navigate to budget', await page.getByRole('tab', { name: /Budget/ }).getAttribute('aria-selected'), 'true');
  check('newly rendered fields stay read-only', await page.locator('#ctl input').first().isDisabled(), true);
  await page.evaluate(() => { window.__context.parameters.ReadOnly.raw = false; window.__control.updateView(window.__context); });
  check('editing is restored after read-only', await page.locator('#ctl input').first().isDisabled(), false);
  await page.getByRole('tab', { name: /Final Report/ }).click();
  for (const [label, extension] of [['Export PDF', '.pdf'], ['Export Word', '.docx']]) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await page.waitForFunction(ext => window.__events.some(e => e.LastEvent === 'file' && e.FileName.endsWith(ext)), extension, { timeout: 30000 });
    const file = await page.evaluate(ext => window.__events.find(e => e.LastEvent === 'file' && e.FileName.endsWith(ext)), extension);
    const bytes = Buffer.from(file.FileBase64, 'base64');
    check(label + ' emits complete bytes', bytes.length, file.FileSizeBytes);
    check(label + ' has document signature', extension === '.pdf' ? bytes.subarray(0, 5).toString() : bytes.subarray(0, 2).toString(), extension === '.pdf' ? '%PDF-' : 'PK');
    if (process.env.WRS_SCREENSHOT_DIR) fs.writeFileSync(path.join(process.env.WRS_SCREENSHOT_DIR, 'sample-report' + extension), bytes);
  }
  check('compiled wrapper has no runtime errors', errors.length, 0);
  await page.evaluate(() => window.__control.destroy());
  await page.close();
} else {
  console.log('Compiled PCF wrapper not present; app-host checks ran, wrapper/export checks require npm --prefix pcf run build.');
}

await browser.close();
server.close();

console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('✓ all browser checks passed');
