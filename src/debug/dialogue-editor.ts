import { CONVERSATIONS, SPEAKERS, TALK, ENTRIES } from '../game/story.ts';
import EDITS_JSON from '../game/dialogue-edits.json';
import type { Conversation, DialogueNode, Rule } from '../types.ts';
const EDITS = EDITS_JSON as unknown as EditsFile;
const hearers = <T extends [string, unknown]>(e: T[]) => e.filter(([id]) => !['hale', 'unknown'].includes(id)); // people Juno can talk to
const rules = (): Rule[] => pending._rules ?? EDITS._rules ?? [];  // who says which conversation, on which visit, under which conditions
const facts = Object.entries(ENTRIES).filter(([, e]) => e.kind === 'facts').map(([id, e]): [string, string] => [id, e.title]);
import { createFlow } from './flow-editor.ts';
import type { EditsFile, ElFn, Pending } from './flow-editor.ts';
import SCENE_EDITS_JSON from '../world/scene-edits.json';
import { SCENES as SCENES_JS, SCENE_KEYS as SCENE_KEYS_JS } from '../world/scenes.ts';

// Scene settings: a number, a colour, a vec3, or null (reset to the game's own).
type SceneValue = number | string | number[] | null;
interface SceneKey { key: string; label: string; type: string; min?: number; max?: number; step?: number; def: number | string | number[] }
const SCENES: Record<string, string> = SCENES_JS;
const SCENE_KEYS: SceneKey[] = SCENE_KEYS_JS;
const SCENE_EDITS = SCENE_EDITS_JSON as unknown as Record<string, Record<string, SceneValue>>;
interface NodeEdit { text?: string; speaker?: string; choices?: Record<number, string> }

// Dev tool (open /editor.html on the dev server). The list is built from CONVERSATIONS, so every conversation added to story.js shows up by itself.
// Edits text, speaker and choice labels; "New conversation" adds one of your own (who Juno talks to + what each side says).
// Changes are collected, then saved together to src/game/dialogue-edits.json by the dev server (vite.config.js); the page reloads after a save.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T; // ids come from editor.html
const el: ElFn = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pending: Pending = {};
const nodeEdits = pending as unknown as Record<string, Record<string, NodeEdit> | undefined>; // the per-conversation keys of pending // { conv: { node: { text?, speaker?, choices?: { i: text } } }, _new: { id: def | null } }
const mine = EDITS._new ?? {};
const titles = { ...(EDITS._titles ?? {}) }; // display names only: the id stays what the game refers to
const titleOf = (id: string) => pending._titles?.[id] ?? titles[id] ?? id;
const added = new Set((EDITS._insert ?? []).filter((x) => x.conv).map((x) => `${x.conv}/${x.id}`)); // lines added in the editor
const people = Object.entries(SPEAKERS).filter(([id]) => id !== 'juno'); // who Juno can talk to
let current = decodeURIComponent(location.hash.slice(1)) || Object.keys(CONVERSATIONS)[0];

const preview = (c: Conversation) => Object.values(c.nodes).map((n) => n.text ?? '').find(Boolean) ?? '';
const flow = (n: DialogueNode) => [n.next && `→ ${n.next}`, n.end && 'ends', n.present && 'present evidence', n.effects && 'effects'].filter(Boolean).join(' · ');
const changed = () => { $<HTMLButtonElement>('save').disabled = false; $('msg').textContent = 'Unsaved changes.'; };
const touch = (conv: string, node: string, fn: (p: NodeEdit) => void) => { fn(((nodeEdits[conv] ??= {})[node] ??= {})); changed(); };
const select = (opts: [string, string][], value: string | undefined, onchange: (v: string) => void) => el('select', { onchange: (e) => onchange((e.target as HTMLSelectElement).value) }, ...opts.map(([id, label]) => el('option', { value: id, selected: id === value }, label)));

function dlgList() {
  const q = $<HTMLInputElement>('q').value.trim().toLowerCase();
  $('items').replaceChildren(...Object.entries(CONVERSATIONS)
    .filter(([id, c]) => !q || id.includes(q) || titleOf(id).toLowerCase().includes(q) || Object.values(c.nodes).some((n) => (n.text ?? '').toLowerCase().includes(q) || (n.choices ?? []).some((ch) => ch.text.toLowerCase().includes(q))))
    .map(([id, c]) => el('a', { className: (id === current ? 'on ' : '') + (mine[id] ? 'mine' : ''), onclick: () => { current = id; location.hash = id; drawList(); drawMain(); } },
      el('b', {}, titleOf(id)), el('small', {}, (titleOf(id) !== id ? `${id} · ` : '') + preview(c)))));
}

function dlgMain() {
  const conv = CONVERSATIONS[current];
  if (!conv) return;
  const q = $<HTMLInputElement>('q').value.trim().toLowerCase();
  const cards = Object.entries(conv.nodes).flatMap(([id, n]) => {
    const card = el('div', { className: 'node' + (nodeEdits[current]?.[id] ? ' dirty' : '') });
    const dirty = () => card.classList.add('dirty');
    card.append(el('div', { className: 'head' }, el('b', {}, id),
      select(Object.entries(SPEAKERS).map(([sid, s]): [string, string] => [sid, s.name]), n.speaker, (v) => { touch(current, id, (p) => { p.speaker = v; }); dirty(); }),
      el('span', { className: 'flow' }, flow(n))));
    const ta: HTMLTextAreaElement = el('textarea', { value: n.text ?? '', oninput: () => { touch(current, id, (p) => { p.text = ta.value; }); dirty(); } });
    if (q && (n.text ?? '').toLowerCase().includes(q)) card.style.outline = '1px solid var(--cyan)';
    card.append(ta);
    (n.choices ?? []).forEach((ch, i) => {
      const inp: HTMLInputElement = el('input', { value: ch.text, oninput: () => { touch(current, id, (p) => { (p.choices ??= {})[i] = inp.value; }); dirty(); } });
      card.append(el('div', { className: 'choice' }, el('span', {}, `choice ${i + 1}`), inp, el('span', {}, ch.end ? 'ends' : ch.next ? `→ ${ch.next}` : '')));
    });
    const out: HTMLElement[] = [card];
    if (!(n.choices ?? []).length) out.push(el('button', { className: 'ghost addline', onclick: () => {
      const last = n.speaker, other = last === 'juno' ? (people.find(([k]) => k !== 'juno' && conv.nodes && Object.values(conv.nodes).some((m) => m.speaker === k))?.[0] ?? people[0][0]) : 'juno';
      ((pending._insert ??= [])).push({ conv: current, after: id, id: `${id}_${Date.now() % 100000}`, speaker: other, text: '' }); changed(); drawMain();
    } }, '+ Add line after this'));
    if (added.has(`${current}/${id}`)) out.push(el('button', { className: 'danger addline', onclick: () => { (pending._remove ??= []).push({ conv: current, id }); changed(); $('msg').textContent = 'Unsaved: this added line will be removed on save.'; } }, 'Remove this added line'));
    for (const d of (pending._insert ?? []).filter((x) => x.conv === current && x.after === id)) { // drafts not saved yet
      const dc = el('div', { className: 'node draft' });
      const ta: HTMLTextAreaElement = el('textarea', { value: d.text, placeholder: 'What is said...', oninput: () => { d.text = ta.value; } });
      dc.append(el('div', { className: 'head' }, el('b', {}, 'new line'), select(Object.entries(SPEAKERS).map(([sid, s]): [string, string] => [sid, s.name]), d.speaker, (v) => { d.speaker = v; }),
        el('button', { className: 'ghost', style: 'margin-left:auto', onclick: () => { pending._insert!.splice(pending._insert!.indexOf(d), 1); if (!pending._insert!.length) delete pending._insert; drawMain(); } }, 'Cancel')), ta);
      out.push(dc);
    }
    return out;
  });
  const nameBox: HTMLInputElement = el('input', { value: titleOf(current) === current ? '' : titleOf(current), placeholder: current, style: 'font-size:18px;width:100%;max-width:420px', oninput: () => { (pending._titles ??= {})[current] = nameBox.value.trim() || null; changed(); } });
  // Who says this, on which visit, and only when what has happened.
  const rule = rules().find((r) => r.conv === current)
    ?? ((): Rule => { const [npc] = Object.entries(TALK).find(([, c]) => c === current) ?? ['']; return { conv: current, npc, when: 'all' }; })();
  const setRule = (patch: Partial<Rule>) => {
    const r = { ...rule, ...patch };
    if (!r.fact) delete r.fact;
    if (!r.talked) delete r.talked;
    pending._rules = [...rules().filter((x) => x.conv !== current), ...(r.npc ? [r] : [])];
    changed(); dlgMain();
  };
  const dis = (sel: HTMLSelectElement) => { if (!rule.npc) sel.disabled = true; return sel; };
  const whoRow = el('div', { style: 'margin-bottom:14px' },
    el('div', { className: 'choice' }, el('span', {}, 'Plays when Juno talks to'),
      select([['', 'Nobody (not used yet)'], ...hearers(people).map(([id, s]): [string, string] => [id, s.name])], rule.npc, (v) => setRule({ npc: v })),
      el('span', {}, 'on'),
      dis(select([['all', 'every visit'], ['1', 'the 1st visit'], ['2', 'the 2nd visit'], ['3', 'the 3rd visit'], ['4', 'the 4th visit and after']], rule.when, (v) => setRule({ when: v })))),
    el('div', { className: 'choice' }, el('span', {}, 'Only if Juno knows'),
      dis(select([['', '(anything, no condition)'], ...facts], rule.fact ?? '', (v) => setRule({ fact: v })))),
    el('div', { className: 'choice' }, el('span', {}, 'Only if Juno has already talked to'),
      dis(select([['', '(anyone, no condition)'], ...hearers(people).map(([id, s]): [string, string] => [id, s.name])], rule.talked ?? '', (v) => setRule({ talked: v })))));
  const top: HTMLElement[] = [el('h1', {}, titleOf(current)), el('div', { className: 'sub' }, 'Name (shown in this list only; the game still uses the id ', el('code', {}, current), '):'), nameBox, whoRow, el('div', { className: 'sub' }, `${cards.length} boxes. They play top to bottom unless a "→" jumps elsewhere.`)];
  if (mine[current]) top.push(el('button', { className: 'danger', style: 'margin-bottom:12px', onclick: () => { ((pending._new ??= {})[current] = null); changed(); $('msg').textContent = 'Unsaved: this conversation will be deleted on save.'; } }, 'Delete this conversation'));
  $('main').replaceChildren(...top, ...cards);
}

// "New conversation": pick who Juno talks to, then write each line and say who speaks it.
function drawNew() {
  const def: { name: string; with: string; active: boolean; lines: { speaker: string; text: string }[]; when?: string; fact?: string; talked?: string } = { name: '', with: people[0][0], active: true, lines: [{ speaker: 'juno', text: '' }, { speaker: people[0][0], text: '' }] };
  const form = el('div', { className: 'form' }, el('h1', {}, 'New conversation'));
  const lines = el('div');
  const drawLines = () => lines.replaceChildren(...def.lines.map((l, i) => {
    const ta: HTMLTextAreaElement = el('textarea', { value: l.text, oninput: () => { l.text = ta.value; } });
    return el('div', { className: 'row' },
      select([['juno', 'Juno'], ...people.map(([id, s]): [string, string] => [id, s.name])], l.speaker, (v) => { l.speaker = v; }), ta,
      el('button', { className: 'ghost', onclick: () => { def.lines.splice(i, 1); drawLines(); } }, '✕'));
  }));
  const withSel = select(people.map(([id, s]): [string, string] => [id, s.name]), def.with, (v) => { def.with = v; });
  const name: HTMLInputElement = el('input', { placeholder: 'short name, e.g. miso_fed (letters, digits, _)', oninput: () => { def.name = name.value; } });
  const when = select([['all', 'Every time (replaces what they say now)'], ['1', 'Only the 1st visit'], ['2', 'Only the 2nd visit'], ['3', 'Only the 3rd visit'], ['4', 'The 4th visit and every one after'], ['none', 'Not yet (just save it)']], 'all', (v) => { def.when = v; });
  form.append(el('label', {}, 'Name'), name, el('label', {}, 'Juno is talking to'), withSel,
    el('label', {}, 'When does Juno hear it?'), when,
    el('label', {}, 'Only if Juno already knows this clue (optional)'), select([['', '(no condition)'], ...facts], '', (v) => { def.fact = v; }),
    el('label', {}, 'Only if Juno has already talked to (optional)'), select([['', '(no condition)'], ...hearers(people).map(([id, s]): [string, string] => [id, s.name])], '', (v) => { def.talked = v; }),
    el('label', {}, 'What is said, in order'), lines,
    el('button', { className: 'ghost', onclick: () => { const last = def.lines.at(-1); def.lines.push({ speaker: last?.speaker === 'juno' ? def.with : 'juno', text: '' }); drawLines(); } }, '+ Add line'),
    ' ', el('button', { onclick: () => {
      const id = def.name.trim().replace(/[^A-Za-z0-9_]/g, '_');
      const lines = def.lines.filter((l) => l.text.trim());
      if (!id || CONVERSATIONS[id] || !lines.length) { $('msg').textContent = 'Needs a unique name and at least one line.'; return; }
      (pending._new ??= {})[id] = { with: def.with, active: false, lines: lines.map((l) => ({ speaker: l.speaker, text: l.text.trim() })) };
      if (def.when !== 'none') pending._rules = [...rules(), { conv: id, npc: def.with, when: def.when ?? 'all', ...(def.fact ? { fact: def.fact } : {}), ...(def.talked ? { talked: def.talked } : {}) }];
      changed(); $('msg').textContent = `"${id}" will be created when you save.`;
      $<HTMLButtonElement>('save').click();
    } }, 'Create'));
  drawLines();
  $('main').replaceChildren(form);
}

// ---- Scenes: lighting and look per scene (saved to src/world/scene-edits.json) ----
const pendingScene: Record<string, Record<string, SceneValue>> = {}; // { area: { key: value | null (reset to the game's own) } }
let mode: string = 'conv', scene = Object.keys(SCENES)[0];
const sceneValue = (area: string, key: string): SceneValue => (pendingScene[area] && key in pendingScene[area] ? pendingScene[area][key] : SCENE_EDITS[area]?.[key] ?? null);
const setScene = (area: string, key: string, v: SceneValue) => { (pendingScene[area] ??= {})[key] = v; changed(); };

function sceneList() {
  $('items').replaceChildren(...Object.entries(SCENES).map(([id, name]) => el('a', { className: id === scene ? 'on' : '', onclick: () => { scene = id; drawList(); drawMain(); } },
    el('b', {}, name), el('small', {}, Object.keys({ ...SCENE_EDITS[id], ...pendingScene[id] }).length ? 'custom settings' : 'game defaults'))));
}
function sceneMain() {
  const rows = SCENE_KEYS.map((k) => {
    const v = sceneValue(scene, k.key), cur = v ?? k.def;
    const cn = cur as number, cs = cur as string, cv = cur as number[]; // which one depends on k.type
    const row = el('div', { className: 'node' + (pendingScene[scene]?.[k.key] !== undefined ? ' dirty' : '') });
    const tag = el('span', { className: 'flow' }, v === null ? 'game default' : 'custom');
    let ctl: HTMLElement;
    if (k.type === 'color') ctl = el('input', { type: 'color', value: cs, oninput: () => { setScene(scene, k.key, (ctl as HTMLInputElement).value); tag.textContent = 'custom'; row.classList.add('dirty'); } });
    else if (k.type === 'num') {
      const num = el('input', { type: 'number', min: k.min, max: k.max, step: k.step, value: cn, style: 'width:90px' });
      const rng = el('input', { type: 'range', min: k.min, max: k.max, step: k.step, value: cn, style: 'flex:1' });
      const go = (src: HTMLInputElement) => { num.value = rng.value = src.value; setScene(scene, k.key, +src.value); tag.textContent = 'custom'; row.classList.add('dirty'); };
      num.oninput = () => go(num); rng.oninput = () => go(rng);
      ctl = el('div', { className: 'choice' }, rng, num);
    } else {
      const ins: HTMLInputElement[] = cv.map((x, i) => el('input', { type: 'number', min: k.min, max: k.max, step: k.step, value: x, style: 'width:90px', oninput: () => { setScene(scene, k.key, ins.map((n) => +n.value)); tag.textContent = 'custom'; row.classList.add('dirty'); } }));
      ctl = el('div', { className: 'choice' }, ...ins);
    }
    const reset = el('button', { className: 'ghost', style: 'margin-left:8px', onclick: () => { setScene(scene, k.key, null); sceneMain(); } }, 'Reset');
    row.append(el('div', { className: 'head' }, el('b', {}, k.label), tag, reset), ctl);
    return row;
  });
  $('main').replaceChildren(el('h1', {}, SCENES[scene]), el('div', { className: 'sub' }, 'Changes apply while Juno is in this scene. "Reset" goes back to the default value. Numbers shown for unset rows are the usual night values.'), ...rows);
}
let flowDraw: ReturnType<typeof createFlow> | null = null;
const drawList = () => (mode === 'scene' ? sceneList() : dlgList());
const drawMain = () => (mode === 'conv' ? dlgMain() : mode === 'flow' ? (flowDraw ??= createFlow({ el, pending, changed }))(document.getElementById('main')!, current) : sceneMain());
const setMode = (m: string) => { mode = m; for (const t of ['conv', 'flow', 'scene']) $(`tab-${t}`).className = m === t ? '' : 'ghost'; $('new').style.display = m === 'conv' ? '' : 'none'; $('q').style.display = m === 'scene' ? 'none' : ''; drawList(); drawMain(); };
$('tab-conv').onclick = () => setMode('conv'); $('tab-scene').onclick = () => setMode('scene'); $('tab-flow').onclick = () => setMode('flow');

$('q').oninput = () => { drawList(); drawMain(); };
$('new').onclick = drawNew;
$('save').onclick = async () => {
  $<HTMLButtonElement>('save').disabled = true; $('msg').textContent = 'Saving...';
  const post = (url: string, body: object): Response | Promise<Response> => (Object.keys(body).length ? fetch(url, { method: 'POST', body: JSON.stringify(body) }) : ({ ok: true } as Response));
  const r1 = await post('/__dialogue-edits', pending), r = r1.ok ? await post('/__scene-edits', pendingScene) : r1;
  $('msg').textContent = r.ok ? 'Saved. Reloading...' : `Save failed: ${await (r as Response).text()}`;
  if (r.ok) { for (const o of [pending, pendingScene]) for (const k of Object.keys(o)) delete o[k]; } else $<HTMLButtonElement>('save').disabled = false;
};
window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => { if (Object.keys(pending).length || Object.keys(pendingScene).length) e.preventDefault(); });
if (!CONVERSATIONS[current]) current = Object.keys(CONVERSATIONS)[0];
drawList(); drawMain();
