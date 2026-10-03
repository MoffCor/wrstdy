// Coaching content for each step of a rate study.
//
// Written for OWRM analysts who may be doing their first study, but terse
// enough that an experienced analyst can collapse it and never look back.
// Each step answers four questions: what is this for, what do I need in hand,
// how do I do it well, and what goes wrong most often.

export const STEP_GUIDES = [
  {
    title: 'Identify the system',
    purpose: 'Who the study is for, and the one number that drives affordability: monthly household income.',
    need: [
      'System name and PWS ID (OK + 7 digits, from SDWIS)',
      'County and population served',
      'Census ACS median household income for the service area',
    ],
    tips: [
      'Divide the ACS annual MHI by 12 — this field is MONTHLY. The tool warns if it looks annual.',
      'AI Estimate can pre-fill blanks from the system name; always verify before publishing.',
      'Geocode puts the system on the dashboard map.',
    ],
    pitfall: 'Annual MHI in the monthly field makes rates look 12× more affordable and can wrongly rule out USDA RD grant eligibility.',
  },
  {
    title: 'Enter customer classes and rates',
    purpose: 'What each class pays today and what you propose — the revenue engine for every number that follows.',
    need: [
      'The adopted rate ordinance (base charge and every block)',
      'A billing register: customer count and gallons by class',
      'Ideally, how many customers fall at each usage level',
    ],
    tips: [
      'Use "Cur→Prop" to seed proposed rates from current, then edit only what changes.',
      'Add a usage distribution — revenue from class averages understates tiered-rate income.',
      'The bill calculator on this page answers "what will a 3,500-gallon customer pay?" instantly.',
      'Bulk Import accepts rows pasted from Excel.',
    ],
    pitfall: 'Rates entered on Current but customers left blank on Proposed — proposed revenue reads $0.',
  },
  {
    title: 'Build the budget',
    purpose: 'Monthly cost to run the system today and under the proposal, including debt and reserves.',
    need: [
      'Last fiscal year actuals (or the adopted budget)',
      'Loan payment schedules (USDA RD, OWRB, bank)',
      'Planned depreciation / capital set-asides',
    ],
    tips: [
      'Enter MONTHLY amounts — divide annual figures by 12.',
      'Copy Cur→Prop, then adjust the lines you expect to change.',
      'Depreciation is a real reserve transfer, not an accounting entry — fund it.',
    ],
    pitfall: 'No depreciation set-aside: the system is not saving to replace pumps, tanks, or meters.',
  },
  {
    title: 'Read the scorecard',
    purpose: 'Whether the proposed rates actually fix the problem — and by how much.',
    need: ['Steps 1–3 complete'],
    tips: [
      'Aim for a budget coverage ratio of 1.25 or better.',
      'Use the Rate Design Assistant to solve for the exact increase that hits a target, then apply it in one click.',
      'Fix anything in the Data Check panel before trusting these numbers.',
    ],
    pitfall: 'A healthy budget coverage ratio with a weak DSCR can still breach a USDA RD or OWRB loan covenant.',
  },
  {
    title: 'Project five years',
    purpose: 'Whether today\'s fix still works in year 3 once costs inflate and one-time projects land.',
    need: ['Beginning fund balance (unrestricted cash)', 'Known capital projects and grants', 'Debt schedule, if payments change'],
    tips: [
      'Click "Suggest" to set the reserve target at three months of operating costs.',
      'Enter grants as NEGATIVE one-time items — they offset cost in that year.',
      'A literal 0 in a debt year means paid off; blank means "use the budget".',
    ],
    pitfall: 'A fund balance that dips negative in year 2 and recovers in year 4 still means the system cannot pay its bills in year 2.',
  },
  {
    title: 'Model alternatives',
    purpose: 'Show the board options: shift burden between classes, hold rates, or phase the increase in.',
    need: ['A proposed rate structure from Step 2'],
    tips: [
      'The Phase-In Planner splits a large increase into equal annual steps.',
      'Presets give quick comparisons; manual multipliers fine-tune each class.',
      'The active scenario is carried into the final report.',
    ],
    pitfall: 'Phasing in an increase delays the revenue — check the projection still clears the reserve target.',
  },
  {
    title: 'Draft the narrative (optional)',
    purpose: 'A plain-language analysis a board member can read in five minutes.',
    need: ['AI connection configured by your administrator'],
    tips: [
      'Generate once, then refine with follow-ups: "shorter", "add motion language", "explain DSCR".',
      'The latest reply is what appears in the report.',
      'Skip this step entirely if you prefer to write the narrative yourself in Step 8.',
    ],
    pitfall: 'AI drafts can misstate a number — compare every figure it cites against the scorecard.',
  },
  {
    title: 'Publish the report',
    purpose: 'The board-ready document: PDF to distribute, Word to edit.',
    need: ['Data Check clear of anything marked "Fix"'],
    tips: [
      'Read the Data Check panel top to bottom before exporting.',
      'Add staff notes and board decisions in Report Notes.',
      'Mark Complete when the report is final — it updates the dashboard.',
    ],
    pitfall: 'Exporting with open "Fix" findings puts a confidently-wrong number in front of a board.',
  },
];

export const SHORTCUTS = [
  { keys: ['Alt', '→'], label: 'Next step' },
  { keys: ['Alt', '←'], label: 'Previous step' },
  { keys: ['Alt', '1–8'], label: 'Jump to a step' },
  { keys: ['Ctrl', 'Z'], label: 'Undo last change' },
  { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo' },
  { keys: ['B'], label: 'Show or hide Drip, the stick-figure guide' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close a dialog' },
];

// The guided tour. Each stop spotlights a real part of the screen (`target`
// is a CSS selector inside the app); a stop whose target isn't on screen is
// skipped, and one with no target is centered. Drip hosts every stop: `drip`
// is his aside and `pose` what he does while saying it.
export const TOUR_DASHBOARD = [
  { title: 'Welcome to the Water Rate Study Tool', pose: 'wave',
    body: 'Help public water systems set rates that cover their true cost of service — and explain them to a board. This quick tour points at the real controls; click Next or use the arrow keys.',
    drip: "Hi! I'm Drip. I'll be your tour guide. Please keep your hands and feet inside the spreadsheet." },
  { target: '.hero-actions', title: 'Start here', pose: 'point',
    body: 'Create a blank study, load the sample (a complete, realistic study with every feature filled in), or reopen this tour later.',
    drip: 'First time? The sample is the fastest way to see everything.' },
  { target: '.start-grid, .kpi-row', title: 'Your caseload at a glance', pose: 'point',
    body: 'With no studies yet these cards get you started — including starting from a known system on the map. Once you have studies, this row shows how many are in progress, healthy, or need attention.',
    drip: 'Orange tiles mean a human should look. You are the human.' },
  { target: '.dash-toolbar', title: 'Find any study', pose: 'think',
    body: 'Switch between the study cards and the map of Choctaw Nation water systems. Search by name, system, PWS ID or county; filter by status; sort by what needs work.',
    drip: 'I tried searching by vibes once. Zero results.' },
  { target: '.sb', title: 'Every study, always one click away', pose: 'point',
    body: 'The sidebar lists every study in this browser. Import and export .json backups at the bottom — a study lives only in this browser until you export it.',
    drip: 'Back up often. Future you will send a thank-you card.' },
  { target: '.hdr-tools', title: 'Help is always up here', pose: 'thumbs',
    body: 'Guide reopens this tour. The 🕺 button turns me on or off (or press B). ⌨ lists keyboard shortcuts, and the text-size menu makes everything bigger.',
    drip: "That's my on/off switch. Please be gentle with it." },
  { title: 'Inside a study: eight steps', pose: 'celebrate',
    body: 'System → Rates → Budget → Scorecard → Projection → Scenarios → Analysis → Report. Each step has a coaching panel at the top, Step 4 can solve for the rates for you, and Ctrl+Z undoes anything. Open the tour again from inside a study for a tour of the workspace.',
    drip: "That's the tour! I'll be down here if you need me — drag me anywhere." },
];

export const TOUR_WORKSPACE = [
  { target: '.stepper', title: 'Eight steps, one direction', pose: 'point',
    body: 'Click any step, or press Alt+← / Alt+→. A ✓ means the step has data; a red ! means something on it needs fixing. The chip on the right opens the Data Check.',
    drip: 'Left to right, like reading. Or like water flowing downhill.' },
  { target: '.step-guide', title: 'A coach on every step', pose: 'point',
    body: "What you'll need, tips, and the mistake people most often make on this step. Collapse it once you know the ropes — the tool remembers.",
    drip: 'Read the "Watch out for" box. It\'s where the bodies are buried. Figuratively.' },
  { target: '.ws-actions', title: 'Study actions', pose: 'think',
    body: "Undo and redo, the backup reminder, the study's status, and the ⋯ menu: duplicate the study, start next year's study, export, or delete.",
    drip: "Duplicate before trying something wild. It's free." },
  { target: '.ws-nv', title: 'Step by step', pose: 'point',
    body: 'Previous and Next walk the steps in order. Step 4 (Scorecard) has the Rate Design Assistant, which solves for the exact rate change that hits your target.',
    drip: 'Step 4 does algebra so you don\'t have to. My favorite.' },
  { title: "You're set", pose: 'celebrate',
    body: 'Fill in steps 1–3, check the scorecard in step 4, and export the board report from step 8. The Data Check tells you exactly what still needs attention.',
    drip: "Go get 'em. I'll be around — click me for tips, drag me anywhere." },
];
