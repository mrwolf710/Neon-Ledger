import type { Choice, Condition, Conversation, DialogueNode } from '../types.ts';
import type { CaseFile } from './casefile.ts';
import type { Clock } from './clock.ts';
import { SPEAKERS, speakerName, CONVERSATIONS, FALLBACK, ALARM_CONVS } from './story.ts';

export const DIALOGUE = { cps: 40 }; // typewriter characters per second

// Runs conversations from the plain data in story.js (format documented in NOTES.md).
// hud.dialogue is the box UI; caseFile supplies facts/flags and the Present picker; clock for setTime effects.
// The dialogue box UI (hud.dialogue), typed structurally.
export interface DialogueUi {
  show(name: string, color: string, speakerId: string): void;
  hide(): void;
  setText(text: string, done: boolean): void;
  setChoices(labels: string[], sel: number, onClick?: (i: number) => void): void;
  onTextClick(fn: () => void): void;
}
export interface DialogueInput { pressed(action: string): boolean }
export interface Dialogue {
  readonly active: boolean;
  onChar: ((char: string, speakerId: string) => void) | null;
  onUi?: (kind: string) => void;
  start(id: string): Promise<void>;
  end(): void;
  update(dt: number, input: DialogueInput): void;
}
type Option = Choice & { present?: boolean };
export function createDialogue({ hud, caseFile, clock }: { hud: { dialogue: DialogueUi }; caseFile: CaseFile; clock?: Clock }): Dialogue {
  const ui = hud.dialogue;
  let endResolve: (() => void) | null = null;
  let conv: Conversation | null = null, node: DialogueNode | null = null, nodeId = '', shown = 0, typing = false, options: Option[] = [], sel = 0, backTo: string | null = null, skipHold = false, clicked = false;

  const holds = (c?: Condition) => !c
    || ((!c.flag || caseFile.hasFlag(c.flag)) && (!c.notFlag || !caseFile.hasFlag(c.notFlag))
      && (!c.fact || caseFile.has(c.fact)) && (!c.notFact || !caseFile.has(c.notFact)));

  const apply = (effects?: DialogueNode['effects']) => caseFile.apply(effects);

  function run(id: string): void {
    nodeId = id; node = conv!.nodes[id];
    if (!node) { console.warn('dialogue: missing node', id); return api.end(); }
    apply(node.effects);
    const sp = SPEAKERS[node.speaker] ?? { name: node.speaker, color: '#fff' };
    ui.show(speakerName(node.speaker, (f) => caseFile.hasFlag(f)), sp.color, node.speaker);
    shown = 0; typing = true; options = []; sel = 0; ui.setChoices([], 0);
    ui.setText('', false);
  }

  function buildOptions() {
    options = (node!.choices ?? []).filter((c) => holds(c.if));
    if (node!.present && caseFile.facts().length) options.push({ text: 'Present evidence…', present: true });
    sel = 0;
    ui.setChoices(options.map((o) => o.text), sel, (i) => { sel = i; choose(); });
  }

  function choose() {
    const o = options[sel];
    if (!o) return;
    if (o.present) {
      ui.setChoices([], 0);
      caseFile.open({
        present: true, keys: Object.keys(node!.present!), // the facts this person reacts to: always offered, even once the board has used them up
        onPick: (fact: string) => { const hit = node!.present![fact]; backTo = hit ? null : nodeId; run(hit ?? node!.presentWrong ?? nodeId); }, // a wrong item answers, then returns to the question menu
        onCancel: () => buildOptions(),
      });
      return;
    }
    api.onUi?.('confirm');
    backTo = null;
    apply(o.effects);
    if (o.next) run(o.next); else api.end();
  }

  const api: Dialogue = {
    get active() { return !!conv; },
    onChar: null, // (char, speakerId) per typed character; Stage 8 plays voice blips from it
    // Returns a promise that resolves when the conversation ends (cutscenes await it).
    start(id: string) {
      const done = new Promise<void>((res) => { endResolve = res; });
      conv = CONVERSATIONS[id] ?? CONVERSATIONS[FALLBACK];
      const first = Array.isArray(conv.start) ? conv.start.find((s) => holds(s.if))!.node : conv.start;
      document.body.classList.add('talking'); document.body.classList.toggle('alarm', ALARM_CONVS.has(id));
      skipHold = true; // the press that opened the conversation must not also skip its first line
      run(first);
      return done;
    },
    end() {
      conv = node = null; ui.hide();
      document.body.classList.remove('talking', 'alarm');
      endResolve?.(); endResolve = null;
    },
    // Call each frame while active. Interact: finish the line, then advance / pick.
    update(dt: number, input: DialogueInput) {
      if (!conv || caseFile.isOpen) return;
      const press = (input.pressed('interact') || clicked) && !skipHold;
      skipHold = false; clicked = false;
      if (typing) {
        const before = Math.floor(shown);
        shown += dt * DIALOGUE.cps;
        const text = node!.text, upto = Math.min(text.length, Math.floor(shown));
        for (let i = before; i < upto; i++) api.onChar?.(text[i], node!.speaker);
        if (press || upto >= text.length) {
          typing = false; ui.setText(text, true);
          if (node!.choices || node!.present) buildOptions();
        } else ui.setText(text.slice(0, upto), false);
        return;
      }
      if (options.length) {
        if (input.pressed('up') || input.pressed('menuUp')) { sel = (sel + options.length - 1) % options.length; api.onUi?.('move'); }
        if (input.pressed('down') || input.pressed('menuDown')) { sel = (sel + 1) % options.length; api.onUi?.('move'); }
        ui.setChoices(options.map((o) => o.text), sel, (i) => { sel = i; choose(); });
        if (press) choose();
        return;
      }
      if (press) { const back = backTo; backTo = null; if (node!.next) run(node!.next); else if (back && !node!.choices) run(back); else api.end(); }
    },
  };
  ui.onTextClick(() => { clicked = true; }); // clicking / tapping the text box acts like pressing interact
  return api;
}
