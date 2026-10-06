import { CONVERSATIONS, SPEAKERS, TALK } from '../game/story.js';
import EDITS from '../game/dialogue-edits.json';

// Dev tool (open /editor.html on the dev server). The list is built from CONVERSATIONS, so every conversation added to story.js shows up by itself.
// Edits text, speaker and choice labels; "New conversation" adds one of your own (who Juno talks to + what each side says).
// Changes are collected, then saved together to src/game/dialogue-edits.json by the dev server (vite.config.js); the page reloads after a save.
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pending = {}; // { conv: { node: { text?, speaker?, choices?: { i: text } } }, _new: { id: def | null } }
const mine = EDITS._new ?? {};
const added = new Set((EDITS._insert ?? []).filter((x) => x.conv).map((x) => `${x.conv}/${x.id}`)); // lines added in the editor
const people = Object.entries(SPEAKERS).filter(([id]) => id !== 'juno'); // who Juno can talk to
let current = decodeURIComponent(location.hash.slice(1)) || Object.keys(CONVERSATIONS)[0];

const preview = (c) => Object.values(c.nodes).map((n) => n.text ?? '').find(Boolean) ?? '';
const flow = (n) => [n.next && `→ ${n.next}`, n.end && 'ends', n.present && 'present evidence', n.effects && 'effects'].filter(Boolean).join(' · ');
const changed = () => { $('save').disabled = false; $('msg').textContent = 'Unsaved changes.'; };
const touch = (conv, node, fn) => { fn(((pending[conv] ??= {})[node] ??= {})); changed(); };
const select = (opts, value, onchange) => el('select', { onchange: (e) => onchange(e.target.value) }, ...opts.map(([id, label]) => el('option', { value: id, selected: id === value }, label)));

function drawList() {
  const q = $('q').value.trim().toLowerCase();
  $('items').replaceChildren(...Object.entries(CONVERSATIONS)
    .filter(([id, c]) => !q || id.includes(q) || Object.values(c.nodes).some((n) => (n.text ?? '').toLowerCase().includes(q) || (n.choices ?? []).some((ch) => ch.text.toLowerCase().includes(q))))
    .map(([id, c]) => el('a', { className: (id === current ? 'on ' : '') + (mine[id] ? 'mine' : ''), onclick: () => { current = id; location.hash = id; drawList(); drawMain(); } },
      el('b', {}, id), el('small', {}, preview(c)))));
}

function drawMain() {
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
  const top = [el('h1', {}, current), el('div', { className: 'sub' }, `${cards.length} boxes. They play top to bottom unless a "→" jumps elsewhere.`)];
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
  const active = el('input', { type: 'checkbox', checked: true, onchange: () => { def.active = active.checked; } });
  form.append(el('label', {}, 'Name'), name, el('label', {}, 'Juno is talking to'), withSel,
    el('label', {}, el('span', {}, ''), active, ' Play this when Juno talks to them (replaces what they say now; the old conversation stays in the list)'),
    el('label', {}, 'What is said, in order'), lines,
    el('button', { className: 'ghost', onclick: () => { const last = def.lines.at(-1); def.lines.push({ speaker: last?.speaker === 'juno' ? def.with : 'juno', text: '' }); drawLines(); } }, '+ Add line'),
    ' ', el('button', { onclick: () => {
      const id = def.name.trim().replace(/[^A-Za-z0-9_]/g, '_');
      const lines = def.lines.filter((l) => l.text.trim());
      if (!id || CONVERSATIONS[id] || !lines.length) { $('msg').textContent = 'Needs a unique name and at least one line.'; return; }
      (pending._new ??= {})[id] = { with: def.with, active: def.active, lines: lines.map((l) => ({ speaker: l.speaker, text: l.text.trim() })) };
      changed(); $('msg').textContent = `"${id}" will be created when you save.`;
      $('save').click();
    } }, 'Create'));
  drawLines();
  $('main').replaceChildren(form);
}

$('q').oninput = () => { drawList(); drawMain(); };
$('new').onclick = drawNew;
$('save').onclick = async () => {
  $('save').disabled = true; $('msg').textContent = 'Saving...';
  const r = await fetch('/__dialogue-edits', { method: 'POST', body: JSON.stringify(pending) });
  $('msg').textContent = r.ok ? 'Saved. Reloading...' : `Save failed: ${await r.text()}`;
  if (r.ok) { for (const k of Object.keys(pending)) delete pending[k]; } else $('save').disabled = false;
};
window.addEventListener('beforeunload', (e) => { if (Object.keys(pending).length) e.preventDefault(); });
if (!CONVERSATIONS[current]) current = Object.keys(CONVERSATIONS)[0];
drawList(); drawMain();
