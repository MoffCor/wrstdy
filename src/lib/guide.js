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

// The first-run tour. Short on purpose: five screens, each one idea.
export const TOUR = [
  {
    icon: '💧',
    title: 'Welcome to the Water Rate Study Tool',
    body: 'Built for the Choctaw Nation Office of Water Resource Management to help public water systems set rates that cover their costs — and to explain those rates to a board.',
    points: ['Eight guided steps from raw billing data to a board-ready report', 'Every number is calculated, checked, and traceable', 'Nothing is sent anywhere unless you export it'],
  },
  {
    icon: '🧭',
    title: 'Eight steps, one direction',
    body: 'Work left to right across the step bar. Each step shows a ✓ once it has data and a red ! if something needs fixing. Every step has a guide you can open at the top of the page.',
    points: ['Steps 1–3: enter what the system has', 'Steps 4–6: see whether the proposal works', 'Steps 7–8: write it up and publish'],
  },
  {
    icon: '🎯',
    title: 'Let the tool do the math',
    body: 'You don\'t have to guess at rates. The Rate Design Assistant solves for the exact increase that reaches a target budget coverage ratio or loan covenant, and applies it in one click.',
    points: ['Solve for a target coverage ratio or DSCR', 'Phase a large increase over several years', 'Quote any customer\'s bill at any usage'],
  },
  {
    icon: '🛡️',
    title: 'A second pair of eyes',
    body: 'The Data Check reviews every study for the mistakes that reach board packets — an annual income in a monthly field, rates with no customers, a fund balance that goes negative.',
    points: ['Findings name the step that fixes them', 'Nothing blocks you; everything is visible', 'Undo any change with Ctrl+Z'],
  },
  {
    icon: '🚀',
    title: 'Ready when you are',
    body: 'Start a new study, open the sample to explore with real-looking numbers, or begin from a water system on the map.',
    points: ['The sample study shows a complete, healthy result', 'Drip, the stick-figure guide, walks you to the next thing to do — toggle him in the header', 'Press ? anytime for keyboard shortcuts; reopen this tour from the Guide button'],
  },
];
