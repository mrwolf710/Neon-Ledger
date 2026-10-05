// node scripts/check-dialogue.mjs — runs the Mama Teo test conversation against stub UI / case file.
import assert from 'node:assert';
globalThis.document = { body: { classList: { add() {}, remove() {} } } };
const { createDialogue } = await import('../src/game/dialogue.js');

const log = { text: '', choices: [], shown: false };
let clickFn = () => {};
const hud = { dialogue: {
  show() { log.shown = true; }, hide() { log.shown = false; },
  setText(s) { log.text = s; }, setChoices(l) { log.choices = l; }, onTextClick(f) { clickFn = f; },
} };
const facts = new Set(), flags = new Set(), people = new Set();
let presentOpts = null, open = false;
const caseFile = {
  get isOpen() { return open; },
  has: (id) => facts.has(id) || people.has(id), hasFlag: (n) => flags.has(n), setFlag: (n) => flags.add(n),
  add: (id) => (id === 'mamaTeo' ? people : facts).add(id),
  apply(effects = []) { for (const e of effects) { if (e.addFact) this.add(e.addFact); if (e.addPerson) this.add(e.addPerson); if (e.setFlag) flags.add(e.setFlag); } },
  open(o) { presentOpts = o; open = true; },
};
const clock = { setTime() {} };
const d = createDialogue({ hud, caseFile, clock });

const input = (...pressed) => ({ pressed: (a) => pressed.includes(a) });
const run = (secs, ...p) => { for (let i = 0; i < secs * 10; i++) d.update(0.1, i === 0 ? input(...p) : input()); };

d.start('teo');
run(0.2);                                    // the opening press is ignored, text starts typing
assert.ok(d.active && log.text.length > 0 && log.text.length < 20, 'typewriter in progress');
run(10);                                     // finishes by itself; no choices on this node
assert.ok(log.text.startsWith("You're the auditor"));
run(0.1, 'interact');                        // advance to the question
run(10);
assert.deepEqual(log.choices, ['Which door did he use?', 'Did anyone follow him?', "That's all."]);
run(0.1, 'down'); run(0.1, 'up');            // wrap-around navigation
run(0.1, 'interact');                        // pick "Which door"
run(10);
assert.ok(facts.has('lock_twice') && people.has('mamaTeo'), 'fact and person added');
run(0.1, 'interact');                        // on to "anything else?"
run(10);
assert.deepEqual(log.choices, ['Did anyone follow him?', "That's all."], 'the other question is still offered');
run(0.1, 'interact');                        // pick "Did anyone follow him?"
run(10); run(0.1, 'interact'); run(10);
assert.deepEqual(log.choices, ["That's all."], 'both asked, only the exit is left');
run(0.1, 'interact');
assert.ok(!d.active, 'conversation ended');

d.start('teo');                              // second visit: Present
run(10);
assert.deepEqual(log.choices, ['Never mind.', 'Present evidence…'], 'asked both already: only exit and Present');
run(0.1, 'down'); run(0.1, 'interact');      // open the case file
assert.ok(open && presentOpts.present);
open = false; presentOpts.onPick('lock_twice');
run(10);
assert.ok(log.text.startsWith('Twice'), 'presented the right fact');
run(0.1, 'interact');
assert.ok(flags.has('teo_cracked') && !d.active);
console.log('dialogue ok');
