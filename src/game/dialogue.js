import { SPEAKERS, CONVERSATIONS, FALLBACK } from './story.js';

export const DIALOGUE = { cps: 40 }; // typewriter characters per second

// Runs conversations from the plain data in story.js (format documented in NOTES.md).
// hud.dialogue is the box UI; caseFile supplies facts/flags and the Present picker; clock for setTime effects.
export function createDialogue({ hud, caseFile, clock }) {
  const ui = hud.dialogue;
  let conv = null, node = null, nodeId = '', shown = 0, typing = false, options = [], sel = 0, skipHold = false, clicked = false;

  const holds = (c) => !c
    || ((!c.flag || caseFile.hasFlag(c.flag)) && (!c.notFlag || !caseFile.hasFlag(c.notFlag))
      && (!c.fact || caseFile.has(c.fact)) && (!c.notFact || !caseFile.has(c.notFact)));

  const apply = (effects) => caseFile.apply(effects);

  function run(id) {
    nodeId = id; node = conv.nodes[id];
    if (!node) { console.warn('dialogue: missing node', id); return api.end(); }
    apply(node.effects);
    const sp = SPEAKERS[node.speaker] ?? { name: node.speaker, color: '#fff' };
    ui.show(sp.name, sp.color);
    shown = 0; typing = true; options = []; sel = 0; ui.setChoices([], 0);
    ui.setText('', false);
  }

  function buildOptions() {
    options = (node.choices ?? []).filter((c) => holds(c.if));
    if (node.present) options.push({ text: 'Present evidence…', present: true });
    sel = 0;
    ui.setChoices(options.map((o) => o.text), sel, (i) => { sel = i; choose(); });
  }

  function choose() {
    const o = options[sel];
    if (!o) return;
    if (o.present) {
      ui.setChoices([], 0);
      caseFile.open({
        present: true,
        onPick: (fact) => run(node.present[fact] ?? node.presentWrong ?? nodeId),
        onCancel: () => buildOptions(),
      });
      return;
    }
    apply(o.effects);
    if (o.next) run(o.next); else api.end();
  }

  const api = {
    get active() { return !!conv; },
    onChar: null, // (char, speakerId) per typed character; Stage 8 plays voice blips from it
    start(id) {
      conv = CONVERSATIONS[id] ?? CONVERSATIONS[FALLBACK];
      const first = Array.isArray(conv.start) ? conv.start.find((s) => holds(s.if)).node : conv.start;
      document.body.classList.add('talking');
      skipHold = true; // the press that opened the conversation must not also skip its first line
      run(first);
    },
    end() {
      conv = node = null; ui.hide();
      document.body.classList.remove('talking');
    },
    // Call each frame while active. Interact: finish the line, then advance / pick.
    update(dt, input) {
      if (!conv || caseFile.isOpen) return;
      const press = (input.pressed('interact') || clicked) && !skipHold;
      skipHold = false; clicked = false;
      if (typing) {
        const before = Math.floor(shown);
        shown += dt * DIALOGUE.cps;
        const text = node.text, upto = Math.min(text.length, Math.floor(shown));
        for (let i = before; i < upto; i++) api.onChar?.(text[i], node.speaker);
        if (press || upto >= text.length) {
          typing = false; ui.setText(text, true);
          if (node.choices || node.present) buildOptions();
        } else ui.setText(text.slice(0, upto), false);
        return;
      }
      if (options.length) {
        if (input.pressed('up') || input.pressed('menuUp')) sel = (sel + options.length - 1) % options.length;
        if (input.pressed('down') || input.pressed('menuDown')) sel = (sel + 1) % options.length;
        ui.setChoices(options.map((o) => o.text), sel, (i) => { sel = i; choose(); });
        if (press) choose();
        return;
      }
      if (press) { if (node.next) run(node.next); else api.end(); }
    },
  };
  ui.onTextClick(() => { clicked = true; }); // clicking / tapping the text box acts like pressing interact
  return api;
}
