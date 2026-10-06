import { CONVERSATIONS, SPEAKERS, TALK } from '../game/story.js';
import EDITS from '../game/dialogue-edits.json';
const VISITS = EDITS._visits ?? {};
const visitList = (npc) => [0, 1, 2, 3].map((i) => pending._visits?.[npc]?.[i] ?? VISITS[npc]?.[i] ?? '');
import SCENE_EDITS from '../world/scene-edits.json';
import { SCENES, SCENE_KEYS } from '../world/scenes.js';

// Dev tool (open /editor.html on the dev server). The list is built from CONVERSATIONS, so every conversation added to story.js shows up by itself.
// Edits text, speaker and choice labels; "New conversation" adds one of your own (who Juno talks to + what each side says).
// Changes are collected, then saved together to src/game/dialogue-edits.json by the dev server (vite.config.js); the page reloads after a save.
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pending = {}; // { conv: { node: { text?, speaker?, choices?: { i: text } } }, _new: { id: def | null } }
const mine = EDITS._new ?? {};
const titles = { ...(EDITS._titles ?? {}) }; // display names only: the id stays what the game refers to
const titleOf = (id) => pending._titles?.[id] ?? titles[id] ?? id;
const added = new Set((EDITS._insert ?? []).filter((x) => x.conv).map((x) => `${x.conv}/${x.id}`)); // lines added in the editor
const people = Object.entries(SPEAKERS).filter(([id]) => id !== 'juno'); // who Juno can talk to
let current = decodeURIComponent(location.hash.slice(1)) || Object.keys(CONVERSATIONS)[0];

const preview = (c) => Object.values(c.nodes).map((n) => n.text ?? '').find(Boolean) ?? '';
const flow = (n) => [n.next && `→ ${n.next}`, n.end && 'ends', n.present && 'present evidence', n.effects && 'effects'].filter(Boolean).join(' · ');
const changed = () => { $('save').disabled = false; $('msg').textContent = 'Unsaved changes.'; };
const touch = (conv, node, fn) => { fn(((pending[conv] ??= {})[node] ??= {})); changed(); };
const select = (opts, value, onchange) => el('select', { onchange: (e) => onchange(e.target.value) }, ...opts.map(([id, label]) => el('option', { value: id, selected: id === value }, label)));

function dlgList() {
  const q = $('q').value.trim().toLowerCase();
  $('items').replaceChildren(...Object.entries(CONVERSATIONS)
    .filter(([id, c]) => !q || id.includes(q) || titleOf(id).toLowerCase().includes(q) || Object.values(c.nodes).some((n) => (n.text ?? '').toLowerCase().includes(q) || (n.choices ?? []).some((ch) => ch.text.toLowerCase().includes(q))))
    .map(([id, c]) => el('a', { className: (id === current ? 'on ' : '') + (mine[id] ? 'mine' : ''), onclick: () => { current = id; location.hash = id; drawList(); drawMain(); } },
      el('b', {}, titleOf(id)), el('small', {}, (titleOf(id) !== id ? `${id} · ` : '') + preview(c)))));
}

function dlgMain() {
  const conv = CONVERSATIONS[current];
  if (!conv) return;
  const q = $('q').value.trim().toLowerCase();
  const cards = Object.entries(conv.nodes).flatMap(([id, n]) => {
    const card = el('div', { className: 'node' + (pending[current]?.[id] ? ' dirty' : '') });
    const dirty = () => card.classList.add('dirty');
    card.append(el('div', { className: 'head' }, el('b', {}, id),
      select(Object.entries(SPEAKERS).map(([sid, s]) => [sid, s.name]), n.speaker, (v) => { touch(current, id, (p) => { p.speaker = v; }); dirty(); }),
      el('span', { className: 'flow' }, flow(n))));
    const ta = el('textarea', { value: n.text ?? '', oninput: () => { touch(current, id, (p) => { p.text = ta.value; }); dirty(); } });
    if (q && (n.text ?? '').toLowerCase().includes(q)) card.style.outline = '1px solid var(--cyan)';
    card.append(ta);
    (n.choices ?? []).forEach((ch, i) => {
      const inp = el('input', { value: ch.text, oninput: () => { touch(current, id, (p) => { (p.choices ??= {})[i] = inp.value; }); dirty(); } });
      card.append(el('div', { className: 'choice' }, el('span', {}, `choice ${i + 1}`), inp, el('span', {}, ch.end ? 'ends' : ch.next ? `→ ${ch.next}` : '')));
    });
    const out = [card];
    if (!(n.choices ?? []).length) out.push(el('button', { className: 'ghost addline', onclick: () => {
      const last = n.speaker, other = last === 'juno' ? (people.find(([k]) => k !== 'juno' && conv.nodes && Object.values(conv.nodes).some((m) => m.speaker === k))?.[0] ?? people[0][0]) : 'juno';
      ((pending._insert ??= [])).push({ conv: current, after: id, id: `${id}_${Date.now() % 100000}`, speaker: other, text: '' }); changed(); drawMain();
    } }, '+ Add line after this'));
    if (added.has(`${current}/${id}`)) out.push(el('button', { className: 'danger addline', onclick: () => { (pending._remove ??= []).push({ conv: current, id }); changed(); $('msg').textContent = 'Unsaved: this added line will be removed on save.'; } }, 'Remove this added line'));
    for (const d of (pending._insert ?? []).filter((x) => x.conv === current && x.after === id)) { // drafts not saved yet
      const dc = el('div', { className: 'node draft' });
      const ta = el('textarea', { value: d.text, placeholder: 'What is said...', oninput: () => { d.text = ta.value; } });
      dc.append(el('div', { className: 'head' }, el('b', {}, 'new line'), select(Object.entries(SPEAKERS).map(([sid, s]) => [sid, s.name]), d.speaker, (v) => { d.speaker = v; }),
        el('button', { className: 'ghost', style: 'margin-left:auto', onclick: () => { pending._insert.splice(pending._insert.indexOf(d), 1); if (!pending._insert.length) delete pending._insert; drawMain(); } }, 'Cancel')), ta);
      out.push(dc);
    }
    return out;
  });
  const nameBox = el('input', { value: titleOf(current) === current ? '' : titleOf(current), placeholder: current, style: 'font-size:18px;width:100%;max-width:420px', oninput: () => { (pending._titles ??= {})[current] = nameBox.value.trim() || null; changed(); } });
  const top = [el('h1', {}, titleOf(current)), el('div', { className: 'sub' }, 'Name (shown in this list only; the game still uses the id ', el('code', {}, current), '):'), nameBox, el('div', { className: 'sub' }, `${cards.length} boxes. They play top to bottom unless a "→" jumps elsewhere.`)];
  if (mine[current]) top.push(el('button', { className: 'danger', style: 'margin-bottom:12px', onclick: () => { ((pending._new ??= {})[current] = null); changed(); $('msg').textContent = 'Unsaved: this conversation will be deleted on save.'; } }, 'Delete this conversation'));
  $('main').replaceChildren(...top, ...cards);
}

// "New conversation": pick who Juno talks to, then write each line and say who speaks it.
function drawNew() {
  const def = { name: '', with: people[0][0], active: true, lines: [{ speaker: 'juno', text: '' }, { speaker: people[0][0], text: '' }] };
  const form = el('div', { className: 'form' }, el('h1', {}, 'New conversation'));
  const lines = el('div');
  const drawLines = () => lines.replaceChildren(...def.lines.map((l, i) => {
    const ta = el('textarea', { value: l.text, oninput: () => { l.text = ta.value; } });
    return el('div', { className: 'row' },
      select([['juno', 'Juno'], ...people.map(([id, s]) => [id, s.name])], l.speaker, (v) => { l.speaker = v; }), ta,
      el('button', { className: 'ghost', onclick: () => { def.lines.splice(i, 1); drawLines(); } }, '✕'));
  }));
  const withSel = select(people.map(([id, s]) => [id, s.name]), def.with, (v) => { def.with = v; });
  const name = el('input', { placeholder: 'short name, e.g. miso_fed (letters, digits, _)', oninput: () => { def.name = name.value; } });
  const when = select([['all', 'Every time (replaces what they say now)'], ['1', 'Only the 1st visit'], ['2', 'Only the 2nd visit'], ['3', 'Only the 3rd visit'], ['4', 'The 4th visit and every one after'], ['none', 'Not yet (just save it)']], 'all', (v) => { def.when = v; });
  form.append(el('label', {}, 'Name'), name, el('label', {}, 'Juno is talking to'), withSel,
    el('label', {}, 'When does Juno hear it?'), when,
    el('label', {}, 'What is said, in order'), lines,
    el('button', { className: 'ghost', onclick: () => { const last = def.lines.at(-1); def.lines.push({ speaker: last?.speaker === 'juno' ? def.with : 'juno', text: '' }); drawLines(); } }, '+ Add line'),
    ' ', el('button', { onclick: () => {
      const id = def.name.trim().replace(/[^A-Za-z0-9_]/g, '_');
      const lines = def.lines.filter((l) => l.text.trim());
      if (!id || CONVERSATIONS[id] || !lines.length) { $('msg').textContent = 'Needs a unique name and at least one line.'; return; }
      (pending._new ??= {})[id] = { with: def.with, active: def.when === undefined || def.when === 'all', lines: lines.map((l) => ({ speaker: l.speaker, text: l.text.trim() })) };
      if (/^[1-4]$/.test(def.when ?? '')) { const l = visitList(def.with); l[+def.when - 1] = id; (pending._visits ??= {})[def.with] = l; } // plays on that visit only
      changed(); $('msg').textContent = `"${id}" will be created when you save.`;
      $('save').click();
    } }, 'Create'));
  drawLines();
  $('main').replaceChildren(form);
}

// ---- Scenes: lighting and look per scene (saved to src/world/scene-edits.json) ----
const pendingScene = {}; // { area: { key: value | null (reset to the game's own) } }
let mode = 'conv', scene = Object.keys(SCENES)[0];
const sceneValue = (area, key) => (pendingScene[area] && key in pendingScene[area] ? pendingScene[area][key] : SCENE_EDITS[area]?.[key] ?? null);
const setScene = (area, key, v) => { (pendingScene[area] ??= {})[key] = v; changed(); };

function sceneList() {
  $('items').replaceChildren(...Object.entries(SCENES).map(([id, name]) => el('a', { className: id === scene ? 'on' : '', onclick: () => { scene = id; drawList(); drawMain(); } },
    el('b', {}, name), el('small', {}, Object.keys({ ...SCENE_EDITS[id], ...pendingScene[id] }).length ? 'custom settings' : 'game defaults'))));
}
function sceneMain() {
  const rows = SCENE_KEYS.map((k) => {
    const v = sceneValue(scene, k.key), cur = v ?? k.def;
    const row = el('div', { className: 'node' + (pendingScene[scene]?.[k.key] !== undefined ? ' dirty' : '') });
    const tag = el('span', { className: 'flow' }, v === null ? 'game default' : 'custom');
    let ctl;
    if (k.type === 'color') ctl = el('input', { type: 'color', value: cur, oninput: () => { setScene(scene, k.key, ctl.value); tag.textContent = 'custom'; row.classList.add('dirty'); } });
    else if (k.type === 'num') {
      const num = el('input', { type: 'number', min: k.min, max: k.max, step: k.step, value: cur, style: 'width:90px' });
      const rng = el('input', { type: 'range', min: k.min, max: k.max, step: k.step, value: cur, style: 'flex:1' });
      const go = (src) => { num.value = rng.value = src.value; setScene(scene, k.key, +src.value); tag.textContent = 'custom'; row.classList.add('dirty'); };
      num.oninput = () => go(num); rng.oninput = () => go(rng);
      ctl = el('div', { className: 'choice' }, rng, num);
    } else {
      const ins = cur.map((x, i) => el('input', { type: 'number', min: k.min, max: k.max, step: k.step, value: x, style: 'width:90px', oninput: () => { setScene(scene, k.key, ins.map((n) => +n.value)); tag.textContent = 'custom'; row.classList.add('dirty'); } }));
      ctl = el('div', { className: 'choice' }, ...ins);
    }
    const reset = el('button', { className: 'ghost', style: 'margin-left:8px', onclick: () => { setScene(scene, k.key, null); sceneMain(); } }, 'Reset');
    row.append(el('div', { className: 'head' }, el('b', {}, k.label), tag, reset), ctl);
    return row;
  });
  $('main').replaceChildren(el('h1', {}, SCENES[scene]), el('div', { className: 'sub' }, 'Changes apply while Juno is in this scene. "Reset" goes back to the default value. Numbers shown for unset rows are the usual night values.'), ...rows);
}
// ---- Revisits: which conversation plays on each visit to a person ----
let who = people.find(([id]) => id !== 'vending' && id !== 'unknown' && id !== 'hale')?.[0] ?? people[0][0];
function visitList_() {
  $('items').replaceChildren(...people.filter(([id]) => !['hale', 'unknown', 'vending'].includes(id)).map(([id, s]) => el('a', { className: id === who ? 'on' : '', onclick: () => { who = id; drawList(); drawMain(); } },
    el('b', {}, s.name), el('small', {}, visitList(id).some(Boolean) ? 'custom revisits' : 'same every time'))));
}
function visitMain() {
  const list = visitList(who), opts = [['', 'Normal (the game default)'], ...Object.keys(CONVERSATIONS).map((id) => [id, titleOf(id)])];
  const rows = ['1st visit', '2nd visit', '3rd visit', '4th visit and every one after'].map((label, i) => {
    const sel = select(opts, list[i], (v) => { const l = visitList(who); l[i] = v; (pending._visits ??= {})[who] = l; changed(); });
    return el('div', { className: 'node' + (pending._visits?.[who] ? ' dirty' : '') }, el('div', { className: 'head' }, el('b', {}, label)), sel);
  });
  $('main').replaceChildren(el('h1', {}, SPEAKERS[who].name), el('div', { className: 'sub' }, 'Pick what they say each time Juno talks to them. "Normal" runs their usual conversation, which already reacts to clues. If you stop at the 2nd visit, it keeps repeating that one. Make new conversations with + New conversation.'), ...rows);
}
const drawList = () => (mode === 'conv' ? dlgList() : mode === 'scene' ? sceneList() : visitList_());
const drawMain = () => (mode === 'conv' ? dlgMain() : mode === 'scene' ? sceneMain() : visitMain());
const setMode = (m) => { mode = m; for (const t of ['conv', 'scene', 'visit']) $(`tab-${t}`).className = m === t ? '' : 'ghost'; $('new').style.display = $('q').style.display = m === 'conv' ? '' : 'none'; drawList(); drawMain(); };
$('tab-conv').onclick = () => setMode('conv'); $('tab-scene').onclick = () => setMode('scene'); $('tab-visit').onclick = () => setMode('visit');

$('q').oninput = () => { drawList(); drawMain(); };
$('new').onclick = drawNew;
$('save').onclick = async () => {
  $('save').disabled = true; $('msg').textContent = 'Saving...';
  const post = (url, body) => (Object.keys(body).length ? fetch(url, { method: 'POST', body: JSON.stringify(body) }) : { ok: true });
  const r1 = await post('/__dialogue-edits', pending), r = r1.ok ? await post('/__scene-edits', pendingScene) : r1;
  $('msg').textContent = r.ok ? 'Saved. Reloading...' : `Save failed: ${await r.text()}`;
  if (r.ok) { for (const o of [pending, pendingScene]) for (const k of Object.keys(o)) delete o[k]; } else $('save').disabled = false;
};
window.addEventListener('beforeunload', (e) => { if (Object.keys(pending).length || Object.keys(pendingScene).length) e.preventDefault(); });
if (!CONVERSATIONS[current]) current = Object.keys(CONVERSATIONS)[0];
drawList(); drawMain();
