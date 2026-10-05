// More of what Drip says. Kept apart from buddy.js (which holds the logic) so
// the copy can grow without burying the code. Tone: dry, brief, a little
// self-aware — he's a colleague with opinions, not a mascot doing a bit.

export const MORE_JOKES = [
  'I asked for a corner office. They gave me the bottom-right corner of the screen.',
  'My resume says "fluent in spreadsheets." It\'s mostly confidence.',
  'I don\'t have a favorite rate tier. I have a least favorite. You know which one.',
  'People ask what I do here. I say "rates." They stop asking.',
  'I was a rounding error once. Then I applied myself.',
  'Every budget has a line called "Other." I respect its mystery.',
  'I tried decaf once. Nothing happened. Like a meeting with no agenda.',
  'They say water finds its own level. So does a budget, eventually, at a public hearing.',
  'I would tell you a joke about reserves, but I\'m saving it.',
  'Depreciation is just your assets quietly aging. Same, honestly.',
  'I\'m not lazy. I\'m in energy-saving mode.',
  'My hard hat is mostly for morale.',
  'A board member once asked me to "just round it." I did. To the nearest cent. Upward.',
  'I don\'t do math in my head. I don\'t have a lot of head.',
  'Leak detection is just listening very hard to a pipe. I do that for fun.',
  'If you see me napping, I\'m modeling the off-peak period.',
  'My five-year plan is mostly snacks.',
  'Compound interest and compound inflation walk into a budget. Only one leaves happy.',
  'I don\'t have a desk. I have a vibe and a plant.',
  'I put "detail-oriented" on my profile, then spelled it wrong. In detail.',
  'Volumetric pricing: paying for what you use. Like a buffet, but fairer.',
  'The best rate study is the one nobody yells about. I\'ve seen it once.',
  'My spirit animal is a water meter. Quiet. Accurate. Underappreciated.',
  'I tried to unionize the stick figures. We couldn\'t agree on a font.',
  'Ask me about my weekend. It was 48 hours long, give or take.',
  'Some people collect stamps. I collect findings. Then I make you fix them.',
  'I don\'t sweat. I condense.',
  'I\'m a morning person. The morning is not a me person.',
  'The water cycle is just water doing a long commute.',
  'I counted the tiers once. There were exactly enough.',
  'You can\'t spell "rates" without "rest." You can, actually. Ignore me.',
  'Budget season is my cardio.',
  'My favorite number is 1.25. It\'s a coverage ratio thing. You wouldn\'t get it. You would, actually — it\'s on the scorecard.',
  'I asked the reserve fund how it was doing. It said "fine," which is what everyone says.',
  'There\'s no "I" in team. There are two in "line item."',
  'I can\'t swim. Bit awkward, given the career.',
  'I once explained tiered rates at a party. I wasn\'t invited back. Worth it.',
  'They wanted a mascot with charisma. They got me. Budget constraints.',
];

export const MORE_IDLE_QUIPS = [
  'Did I leave the faucet running? …No. I don\'t have a faucet.',
  'Somewhere a meter is spinning. I can feel it.',
  'Thinking about block rates. Don\'t mind me.',
  'Hm. That font is doing its best.',
  'I could reorganize the sidebar. I won\'t. But I could.',
  'Quiet in here. Good quiet.',
  '…carry the one…',
  'If anyone needs me, I\'ll be right here. Standing. Professionally.',
  'I alphabetized my thoughts. Took a second.',
  'Is that a new study? No? Carry on.',
  'Note to self: buy more ladders.',
  'This is my thinking pose. It\'s identical to my other pose.',
  'Stretching. Stick figures seize up.',
  'Just admiring the scorecard. From a distance.',
  'I wonder what the other tools are doing. Probably nothing this fun.',
  '*hums the hold music from the last phone call*',
  'Does anyone else hear that? …Never mind. It\'s the budget.',
  'Counting to ten. In gallons.',
  'Every dot on that map is somebody\'s tap water. Neat.',
  'I could use a snack. Do stick figures eat? Asking for me.',
  'One day I\'ll get a second hat. One day.',
  'Waiting is just pre-helping.',
  'Hydrate. That\'s the whole message.',
  'If you need a second opinion, I have the same first one.',
  'Remember to back up. I say this with love.',
  'Fun fact: this tool has never once been late to a meeting.',
  'I\'m on break. My break is also my job.',
  'Water you up to? …I\'m allowed one per day.',
];

export const MORE_WAKE_LINES = [
  'I was listening. With my eyes closed. It\'s a technique.',
  'Five more minutes… okay, I\'m up. I\'m up.',
  'Whoa. How long was I out? Don\'t answer that.',
];

export const MORE_HOVER_LINES = ['Yes? I\'m listening.', 'Need something? Click me.', 'Personal space. Kidding. Hi.', 'I see you. Hello.'];

export const MORE_DRAG_LINES = ['This is a hostage situation.', 'I can walk, you know.', 'Okay, but gently with the hat.', 'New office? Sure. Why not.'];

export const MORE_DIZZY_LINES = ['I\'m going to sit down for a fiscal year.', 'Which way is the bottom of the screen?', 'Please stop. Kindly. With love.'];

// App events. Merged into BUDDY_EVENTS' lines.
export const MORE_EVENT_LINES = {
  undo: ['Undone. Nobody has to know.', 'Back it goes.', 'That never happened. Officially.'],
  redo: ['Redone. Decisive.', 'Never mind. It happened again.'],
  export: ['Export complete. Very official. Very file.', 'There it goes. Fly safe, little report.', 'Filed. With feeling.'],
  apply: ['New rates applied. The scorecard should look happier.', 'That\'s the target. Every rate moved together.', 'Applied. I\'ll pretend I did the algebra.'],
  created: ['Blank page. My favorite. Start with Step 1.', 'Fresh study. Let\'s keep this one tidy.'],
  duplicated: ['A copy. Experiment freely.', 'Two of them now. Keep track of which is the real one.'],
  rolled: ['Next year already. Time flies when you\'re budgeting.', 'New year, same system, better rates. Check the opening balance in Step 5.'],
  deleted: ['And it\'s gone. Hope there was a backup.', 'Deleted. I\'ll miss it a reasonable amount.'],
  tourDone: ['Tour\'s over. Gift shop is to your left. There is no gift shop.', 'You made it. Most people skip.'],
};

// Getting around: a dry aside for each way he travels, said now and then.
export const MOVE_LINES = {
  ladder: ['Ladder. Expensed under "equipment, misc."', 'OSHA would like a word.', 'Three points of contact. I have four lines. We\'re fine.', 'Folding ladder. Folding pride.'],
  balloon: ['Helium is not in the budget.', 'This is a normal way to travel.', 'Do not let go of the string. — me, to me', 'Up we go. Mostly on purpose.'],
  stairs: ['Stairs. Built them myself. Just now.', 'Taking the stairs. Doctor\'s orders.', 'One step at a time. Literally.'],
  trampoline: ['Trampoline. Don\'t try this at home.', 'Boing. That\'s the technical term.', 'Gravity: politely declined.'],
  rope: ['Grappling hook. Standard issue.', 'Hand over hand. Like a professional. Or a squirrel.', 'Do I know how to do this? We\'ll see.'],
  jetpack: ['Jetpack. Don\'t ask where I got it.', 'Fuel is billed under "vehicles."', 'This is not FAA approved.'],
  elevator: ['Going up.', 'Elevator. Tiny one. Very exclusive.', '*elevator music*'],
  pogo: ['Pogo stick. The commute of champions.', 'Boing. Boing. Boing. Arrived.', 'Efficient? No. Joyful? Somewhat.'],
  fly: ['Please don\'t tell facilities.', 'I don\'t know how I do this either.', 'Flying. Don\'t make it weird.'],
  umbrella: ['Mary Poppins was a consultant too.', 'Controlled descent.', 'It\'s not raining. It\'s strategy.'],
  parachute: ['Parachute. Packed it myself. Mostly.', 'Coming in for a landing.', 'This is the fun part.'],
  slide: ['Slide! Absolutely necessary.', 'The fastest way down is also the best.', 'Wheee — I mean, proceeding downward.'],
  pole: ['Fire pole. Every office should have one.', 'Emergency descent. There is no emergency.', 'Sliding into the next task.'],
  jump: ['Shortcut.', 'I\'ve done this before. Probably.', 'Watch this.'],
  skate: ['Skateboard. For efficiency.', 'Rolling through.', 'Coming through — mind the toes.'],
  cartwheel: ['Cartwheel. It\'s faster. It is not faster.', 'Can\'t stop. Won\'t stop.', 'Gymnastics: unpaid, unrequested.'],
  moonwalk: ['Walking forward is overrated.', 'Smooth.', 'I\'m told this is how the pros do it.'],
  tiptoe: ['Sneaking. Don\'t mind me.', 'Shh. Spreadsheet is sleeping.', 'Very quiet. Very sneaky.'],
};
// The "What can you do?" showreel.
export const SHOWREEL_OPENERS = ['The highlights. Hold my hat.', 'Okay. Watch closely, there\'s no replay.', 'One show only. No refunds.'];
export const SHOWREEL_CLOSERS = ['Thank you, thank you. I\'m here all week.', 'And that\'s the show. Back to the budget.', 'I also do birthdays.'];
export const LANDING_LINES = ['Stuck it.', 'Ten out of ten. Judges agree.', 'Nailed it.'];
export const SPLAT_LINES = ['I meant to do that.', 'That was a test. Of the floor.', 'Floor\'s solid. Good to know.', 'Everything is fine.'];

// Little activities. Short, often silent.
export const ACTIVITY_LINES = {
  trip: ['Who put that pebble there?', 'Nobody saw that.', 'The floor moved.'],
  slip: ['Water on the floor. Of all the people.', 'Should\'ve seen that coming. Water is my whole thing.', 'Wet floor. Sign pending.'],
  sneeze: ['Bless me.', 'Excuse me. Allergic to dust. And spreadsheets.', 'That hat costs money, you know.'],
  hiccup: ['Hic. Sorry. Hic.', 'Hold my breath? I don\'t breathe. Hic.', 'Must have drunk my water too fast.'],
  yoyo: ['Yo-yo. Up and down, like a fund balance.', 'Walk the dog. The dog is a water drop.'],
  juggle: ['Juggling. It\'s like scenarios, but rounder.', 'Three priorities, two hands.'],
  jumprope: ['Cardio.', 'Jump rope. Keeps the knees honest.', 'Hasn\'t tripped me yet. Wait.'],
  hula: ['Hula hoop. Core strength. What core?', 'Still got it.'],
  selfie: ['For the newsletter.', 'Say "rates."', 'Profile picture. Finally.'],
  magic: ['Nothing up my sleeves. I don\'t have sleeves.', 'Ta-da. A water drop. From a hat. You\'re welcome.', 'For my next trick, a balanced budget.'],
  plane: ['Paper airplane. Made it from the old rate schedule.', 'Air mail.'],
  fish: ['Fishing for savings.', 'Something\'s biting.', 'Catch of the day.'],
  stretch: ['Stretching. My lines get stiff.', 'Ahh. That\'s the stuff.'],
};
export const FISH_CATCHES = [
  { item: 'fish', say: 'A fish. Throwing it back.' },
  { item: 'dollar', say: 'Found a dollar in the budget. Very rare.' },
  { item: 'boot', say: 'A boot. Classic.' },
  { item: 'drop', say: 'A water drop. Fitting.' },
];

// Useful, short, rotated in when he's idle with nothing better to say.
export const PRO_TIPS = [
  'Tip: Ctrl+Z undoes the last change to the study. Inside a text box it undoes the text instead.',
  'Tip: Alt+→ and Alt+← move between steps. Alt+1 through Alt+8 jump right to one.',
  'Tip: "Duplicate study" in the ⋯ menu lets you try a bolder option without touching the original.',
  'Tip: the Rate Design Assistant in Step 4 solves for the exact increase to hit a coverage target.',
  'Tip: a big increase can be phased in over a few years — see the Phase-In Planner in Step 6.',
  'Tip: Step 2\'s bill calculator answers "what does this do to my bill?" for any usage.',
  'Tip: the red ! on a step means the Data Check found something there. Click the chip to see what.',
  'Tip: this study lives in this browser. Export a .json backup now and then.',
  'Tip: enter monthly median household income. Census publishes it annually — divide by 12.',
  'Tip: next year, "Start next year\'s study" in the ⋯ menu carries the proposed rates forward as current.',
  'Tip: every step has a guide at the top, and a "Tour this step" button that points things out.',
  'Tip: press ? any time to see the keyboard shortcuts.',
  'Tip: blank in the debt schedule keeps the budget\'s debt; 0 means the loan is paid off. They\'re different.',
  'Tip: the usage distribution in Step 2 makes tiered revenue much more accurate than class averages.',
  'Tip: the AI analysis is a first draft. Read it before it goes in a board packet.',
  'Tip: you can drag me anywhere. I won\'t take it personally.',
];

// Field help: when the cursor lands in a field whose label matches, he
// explains it once per session.
export const GLOSSARY = [
  { match: /median.*income|\bMHI\b/i, say: 'MHI is median household income, per MONTH here. Census ACS publishes it per year — divide by 12. Affordability is measured against it.' },
  { match: /population/i, say: 'Population served — people, not connections. Used for context and per-capita figures.' },
  { match: /PWS ID/i, say: 'PWS ID: the state\'s ID for the water system. Oklahoma ones are OK + 7 digits. It\'s on SDWIS.' },
  { match: /minimum charge|base charge/i, say: 'Base (minimum) charge: what a customer pays before using a drop. It covers the fixed costs of being connected.' },
  { match: /rate per 1,?000|\$\/1,?000/i, say: 'Block rates are dollars per 1,000 gallons. Usage fills the first block first, then the next; the last block\'s rate applies to everything above it.' },
  { match: /upper limit/i, say: 'Block limit: usage up to this many gallons is billed at this block\'s rate. Anything above it spills into the next block.' },
  { match: /customers/i, say: 'Customers: active accounts billed in this class each month.' },
  { match: /gallons/i, say: 'Gallons: monthly usage, as billed. Tiers are cumulative — the first block fills first, then the next.' },
  { match: /debt service|loan/i, say: 'Debt service: loan payments. They count in budget coverage, and they\'re what DSCR measures against.' },
  { match: /depreciation/i, say: 'Depreciation: setting money aside as equipment wears out. Leaving it at zero means paying for replacements all at once later.' },
  { match: /reserve|fund balance/i, say: 'Fund balance and reserves: the cushion. A common target is a few months of operating costs.' },
  { match: /inflation/i, say: 'Inflation raises operating costs (not debt) from year 2 of the projection, compounding: at 3% a year, year 5 is about 13% higher.' },
  { match: /growth/i, say: 'Growth: how the customer base changes each year. Small numbers, big effect over five years.' },
  { match: /target/i, say: 'Target: what you\'re solving toward. 1.25 is the planning benchmark for both budget coverage and DSCR.' },
  { match: /salar|wage|employee/i, say: 'Staff costs: wages and benefits, monthly. Usually the biggest line in a small system\'s budget.' },
  { match: /chemical|treatment/i, say: 'Treatment costs: chemicals and testing. They rise with the volume you produce.' },
  { match: /electric|power|utilit/i, say: 'Power: pumping is electricity. If the rates go up, this line goes up with them.' },
  { match: /purchased water|wholesale/i, say: 'Purchased water: what the system pays a supplier. If it buys water, this belongs in the budget.' },
];

// Extra step tips: practical, and a few with a smile.
export const MORE_STEP_TIPS = {
  dashboard: [
    { say: 'The map shows every Choctaw Nation water system I know about. Click one to start a study with its details filled in.', target: '.dash-toolbar' },
    { say: 'Studies only live in this browser. Use Export in the sidebar to keep a backup somewhere safe.', target: '.sb' },
    { say: 'Sort by "Most issues" to see which studies need attention first.', target: '.dash-toolbar' },
  ],
  0: [
    { say: 'Fill in the study year. Next year\'s study counts forward from it.' },
    { say: 'Contact information goes on the report cover. Make sure it\'s someone who answers the phone.' },
  ],
  1: [
    { say: 'Disable classes the system doesn\'t have. They\'ll stop cluttering every report.' },
    { say: 'You can paste classes from a spreadsheet with Bulk Import — tab- or comma-separated.' },
    { say: 'Copy Cur → Prop starts the proposed side from today\'s rates. Then adjust.' },
  ],
  2: [
    { say: 'Every line is monthly. If the system reports annual numbers, divide by 12.' },
    { say: 'The proposed budget is next year\'s plan, including anything they\'ve been putting off.' },
    { say: 'Asset replacement belongs here even if nobody likes it. Especially if nobody likes it.' },
  ],
  3: [
    { say: 'If the scorecard is mostly red on the current side, that\'s the reason for the study. Normal.' },
    { say: 'The scorecard updates as you change rates in Step 2. Flip back and forth if you like.' },
  ],
  4: [
    { say: 'Known one-time items: a new pump, a tank repaint, a grant. Put them in the year they happen.' },
    { say: 'The opening fund balance should be the audited number, not a guess.' },
  ],
  5: [
    { say: 'Scenarios don\'t change your proposed rates. They\'re a sandbox.' },
    { say: 'Presets are starting points. Every multiplier is editable.' },
  ],
  6: [
    { say: 'Ask the AI to rewrite for a specific audience: a board, a newsletter, a public notice.' },
  ],
  7: [
    { say: 'Add report notes for anything the numbers don\'t say on their own.' },
    { say: 'The Data Check at the top should be clear before this goes to a board.' },
  ],
};
