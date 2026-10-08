import { CONVERSATIONS, SPEAKERS, ENTRIES } from '../game/story.js';
import EDITS from '../game/dialogue-edits.json';

// Flowchart editor for conversations (Neon Editor, "Story flow" tab). Every dialogue box is a card; every way out of a box
// (next line, choice, present-evidence, start rule) has a dot you drag onto another card, or a dropdown. Saves the whole
// conversation as EDITS._graph[conv] and the card positions as EDITS._layout[conv]; story.js lays _graph over its own data.
export const FLOW = {
  cardW: 270, gapX: 90, gapY: 30, rowStep: 250, // auto layout when a card has no saved position
  colors: { next: '#8a8aa8', choice: '#1fd6e8', present: '#ff6fb5', wrong: '#f2a93b', start: '#39ff14' },
};
const CSS = `
.fwrap{position:relative;height:calc(100vh - 210px);overflow:auto;border:1px solid var(--line);border-radius:8px;background:#0a0a14}
.fboard{position:relative}
.fboard svg{position:absolute;left:0;top:0;pointer-events:none}
.fc{position:absolute;width:${FLOW.cardW}px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:12px}
.fc.start{border-color:#39ff14}
.fc .hd{display:flex;gap:6px;align-items:center;cursor:grab;margin-bottom:4px}
.fc .hd b{flex:1;color:var(--cyan)}
.fc textarea{min-height:54px;font-size:12px}
.fc input,.fc select{font-size:12px;padding:3px 5px;min-width:0}
.fc button{padding:2px 8px;font-size:12px}
.fo{display:flex;gap:4px;align-items:center;margin-top:4px}
.fo>span{color:var(--dim);white-space:nowrap}
.fo select{flex:1}
.fo input{flex:1}
.port{width:13px;height:13px;border-radius:50%;flex:none;cursor:crosshair;border:2px solid #0a0a14}
.fsub{border-top:1px dashed var(--line);margin-top:6px;padding-top:2px}
.bad{border-color:#ff4d4d!important}
`;

const clone = (o) => JSON.parse(JSON.stringify(o));
const facts = Object.entries(ENTRIES).filter(([, e]) => e.kind === 'facts').map(([id, e]) => [id, e.title]);
const outs = (n) => [n.next, ...(n.choices ?? []).map((c) => c.next), ...Object.values(n.present ?? {}), n.presentWrong].filter(Boolean);

export function createFlow({ el, pending, changed }) {
  document.head.append(el('style', {}, CSS));
  const work = {}; // conv -> { start: [{ if?, node }], nodes, pos }
  let counter = 0;

  function load(conv) {
    if (work[conv]) return work[conv];
    const g = CONVERSATIONS[conv];
    const d = work[conv] = { start: (Array.isArray(g.start) ? clone(g.start) : [{ node: g.start }]), nodes: clone(g.nodes), pos: clone(EDITS._layout?.[conv] ?? {}) };
    // Auto layout for cards without a saved position: columns by distance from the start.
    const depth = {}, queue = d.start.map((s) => s.node);
    queue.forEach((id) => { depth[id] = 0; });
    for (let i = 0; i < queue.length; i++) for (const t of outs(d.nodes[queue[i]] ?? {})) if (!(t in depth) && d.nodes[t]) { depth[t] = depth[queue[i]] + 1; queue.push(t); }
    const rows = {};
    for (const id of Object.keys(d.nodes)) {
      if (d.pos[id]) continue;
      const c = depth[id] ?? 0; rows[c] = (rows[c] ?? 0) + 1;
      d.pos[id] = [20 + FLOW.cardW + FLOW.gapX + c * (FLOW.cardW + FLOW.gapX), 20 + (rows[c] - 1) * FLOW.rowStep];
    }
    d.pos._start ??= [20, 20];
    return d;
  }

  const commit = (conv, d) => {
    const start = d.start.length === 1 && !d.start[0].if ? d.start[0].node : d.start;
    (pending._graph ??= {})[conv] = { start, nodes: d.nodes };
    (pending._layout ??= {})[conv] = d.pos;
    changed();
  };

  // Draws the chart for one conversation into `host`.
  return function draw(host, conv) {
    const d = load(conv);
    const keepX = host.querySelector('.fwrap')?.scrollLeft ?? 0, keepY = host.querySelector('.fwrap')?.scrollTop ?? 0;
    const save = () => commit(conv, d);
    const wrap = el('div', { className: 'fwrap' }), board = el('div', { className: 'fboard' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.innerHTML = Object.entries(FLOW.colors).map(([k, c]) => `<marker id="a-${k}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="${c}"/></marker>`).join('');
    board.append(svg); wrap.append(board);
    const cards = {}, links = []; // links: { port, get(): target id, kind }

    const redraw = () => {
      const b = board.getBoundingClientRect();
      let w = 600, h = 400;
      for (const c of Object.values(cards)) { w = Math.max(w, c.offsetLeft + c.offsetWidth + 80); h = Math.max(h, c.offsetTop + c.offsetHeight + 80); }
      Object.assign(board.style, { width: `${w}px`, height: `${h}px` }); svg.setAttribute('width', w); svg.setAttribute('height', h);
      svg.querySelectorAll('path.e').forEach((p) => p.remove());
      for (const l of links) {
        const t = cards[l.get()];
        if (!t) continue;
        const p = l.port.getBoundingClientRect(), x1 = p.left + p.width / 2 - b.left, y1 = p.top + p.height / 2 - b.top, x2 = t.offsetLeft, y2 = t.offsetTop + 18;
        const dx = Math.max(50, Math.abs(x2 - x1) / 2);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('class', 'e'); path.setAttribute('d', `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`);
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', FLOW.colors[l.kind]); path.setAttribute('stroke-width', '2'); path.setAttribute('marker-end', `url(#a-${l.kind})`);
        svg.append(path);
      }
    };

    // One way out of a card: a label, a dropdown of targets and a dot to drag onto another card.
    const outRow = (label, kind, get, set, { allowEnd = true, allowNone = true } = {}) => {
      const opts = [...(allowNone ? [['', '(none)']] : []), ...(allowEnd ? [['__end', 'END']] : []), ...Object.keys(d.nodes).map((id) => [id, id])];
      const sel = el('select', { onchange: () => { set(sel.value); save(); redraw(); } }, ...opts.map(([v, t]) => el('option', { value: v, selected: v === get(), textContent: t })));
      const port = el('span', { className: 'port', style: `background:${FLOW.colors[kind]}`, title: 'Drag onto a card to connect' });
      port.onpointerdown = (e) => {
        e.preventDefault(); port.setPointerCapture(e.pointerId);
        const line = document.createElementNS(svgNS, 'path'); line.setAttribute('stroke', FLOW.colors[kind]); line.setAttribute('stroke-dasharray', '4'); line.setAttribute('fill', 'none'); svg.append(line);
        const move = (ev) => {
          const b = board.getBoundingClientRect(), p = port.getBoundingClientRect();
          line.setAttribute('d', `M${p.left + 6 - b.left} ${p.top + 6 - b.top} L${ev.clientX - b.left} ${ev.clientY - b.top}`);
        };
        const up = (ev) => {
          port.removeEventListener('pointermove', move); port.removeEventListener('pointerup', up); line.remove();
          const id = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.fc')?.dataset.id;
          if (id && id !== '_start') { set(id); sel.value = id; save(); redraw(); }
        };
        port.addEventListener('pointermove', move); port.addEventListener('pointerup', up);
      };
      links.push({ port, get, kind });
      return el('div', { className: 'fo' }, el('span', {}, label), sel, port);
    };
    const jsonBox = (obj, key, ph) => {
      const i = el('input', { placeholder: ph, value: obj[key] ? JSON.stringify(obj[key]) : '' });
      i.onchange = () => {
        if (!i.value.trim()) { delete obj[key]; i.classList.remove('bad'); save(); return; }
        try { obj[key] = JSON.parse(i.value); i.classList.remove('bad'); save(); } catch { i.classList.add('bad'); }
      };
      return i;
    };
    const targetOf = (o, k = 'next') => o.end ? '__end' : o[k] ?? '';
    const setTarget = (o, v, k = 'next') => { delete o[k]; delete o.end; if (v === '__end') o.end = true; else if (v) o[k] = v; };
    const rebuild = () => draw(host, conv);
    const dragCard = (card, key) => {
      card.querySelector('.hd').onpointerdown = (e) => {
        if (e.target.closest('select,button,input')) return;
        const hd = e.currentTarget, ox = e.clientX - card.offsetLeft, oy = e.clientY - card.offsetTop;
        hd.setPointerCapture(e.pointerId);
        const move = (ev) => { const p = [Math.max(0, ev.clientX - ox), Math.max(0, ev.clientY - oy)]; d.pos[key] = p; card.style.left = `${p[0]}px`; card.style.top = `${p[1]}px`; redraw(); };
        const up = () => { hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); save(); };
        hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up);
      };
    };
    const place = (card, key) => { const p = d.pos[key]; card.style.left = `${p[0]}px`; card.style.top = `${p[1]}px`; board.append(card); };

    // The START card: where the conversation begins, with optional conditions ("if" = { flag?, notFlag?, fact?, notFact? }).
    const sc = el('div', { className: 'fc start' }); sc.dataset.id = '_start';
    sc.append(el('div', { className: 'hd' }, el('b', { style: 'color:#39ff14' }, 'START')));
    d.start.forEach((s, i) => {
      sc.append(el('div', { className: 'fsub' }, outRow(s.if ? `rule ${i + 1}` : 'otherwise', 'start', () => s.node, (v) => { if (v && v !== '__end') s.node = v; }, { allowEnd: false, allowNone: false }),
        jsonBox(s, 'if', 'condition, e.g. {"flag":"x"}'),
        el('button', { className: 'ghost', onclick: () => { if (d.start.length > 1) { d.start.splice(i, 1); save(); rebuild(); } } }, 'remove rule')));
    });
    sc.append(el('button', { className: 'ghost', style: 'margin-top:6px', onclick: () => { d.start.unshift({ if: {}, node: Object.keys(d.nodes)[0] }); save(); rebuild(); } }, '+ start rule'));
    dragCard(sc, '_start'); place(sc, '_start'); cards._start = sc;

    for (const [id, n] of Object.entries(d.nodes)) {
      const card = el('div', { className: 'fc' }); card.dataset.id = id;
      const speaker = el('select', { onchange: () => { n.speaker = speaker.value; save(); } }, ...Object.entries(SPEAKERS).map(([k, v]) => el('option', { value: k, selected: k === n.speaker, textContent: v.name })));
      card.append(el('div', { className: 'hd' }, el('b', {}, id), speaker,
        el('button', { className: 'danger', title: 'Delete this box', onclick: () => {
          delete d.nodes[id]; delete d.pos[id];
          d.start = d.start.filter((s) => s.node !== id); if (!d.start.length) d.start = [{ node: Object.keys(d.nodes)[0] }];
          for (const m of Object.values(d.nodes)) { // drop every link to it
            if (m.next === id) delete m.next;
            (m.choices ?? []).forEach((c) => { if (c.next === id) delete c.next; });
            for (const [f, t] of Object.entries(m.present ?? {})) if (t === id) delete m.present[f];
            if (m.presentWrong === id) delete m.presentWrong;
          }
          save(); rebuild();
        } }, '✕')));
      card.append(el('textarea', { value: n.text ?? '', oninput: (e) => { n.text = e.target.value; save(); } }));
      card.append(outRow('next', 'next', () => targetOf(n), (v) => setTarget(n, v)));
      (n.choices ?? []).forEach((c, i) => {
        card.append(el('div', { className: 'fsub' },
          el('div', { className: 'fo' }, el('span', {}, `choice ${i + 1}`), el('input', { value: c.text ?? '', oninput: (e) => { c.text = e.target.value; save(); } }),
            el('button', { className: 'danger', onclick: () => { n.choices.splice(i, 1); if (!n.choices.length) delete n.choices; save(); rebuild(); } }, '✕')),
          outRow('→', 'choice', () => targetOf(c), (v) => setTarget(c, v)), jsonBox(c, 'if', 'show if {…}'), jsonBox(c, 'effects', 'effects […]')));
      });
      card.append(el('button', { className: 'ghost', style: 'margin-top:6px', onclick: () => { (n.choices ??= []).push({ text: 'New choice', end: true }); save(); rebuild(); } }, '+ choice'));
      Object.entries(n.present ?? {}).forEach(([fact, target]) => {
        const fs = el('select', { onchange: () => { delete n.present[fact]; n.present[fs.value] = target; save(); rebuild(); } }, ...facts.map(([f, t]) => el('option', { value: f, selected: f === fact, textContent: t })));
        card.append(el('div', { className: 'fsub' }, el('div', { className: 'fo' }, el('span', {}, 'present'), fs,
          el('button', { className: 'danger', onclick: () => { delete n.present[fact]; if (!Object.keys(n.present).length) { delete n.present; delete n.presentWrong; } save(); rebuild(); } }, '✕')),
          outRow('→', 'present', () => n.present[fact] ?? '', (v) => { if (v && v !== '__end') n.present[fact] = v; }, { allowEnd: false, allowNone: false })));
      });
      if (n.present) card.append(outRow('wrong', 'wrong', () => n.presentWrong ?? '', (v) => { if (v && v !== '__end') n.presentWrong = v; else delete n.presentWrong; }, { allowEnd: false }));
      card.append(el('button', { className: 'ghost', style: 'margin:6px 4px 0 0', onclick: () => { (n.present ??= {})[facts.find(([f]) => !(f in (n.present ?? {})))?.[0] ?? facts[0][0]] = Object.keys(d.nodes).find((k) => k !== id) ?? id; save(); rebuild(); } }, '+ present evidence'));
      card.append(jsonBox(n, 'effects', 'effects on entering […]'));
      dragCard(card, id); place(card, id); cards[id] = card;
    }

    const bar = el('div', { className: 'fo', style: 'margin-bottom:8px;gap:8px' },
      el('button', { onclick: () => {
        let id; do { id = `n${++counter}`; } while (d.nodes[id]);
        d.nodes[id] = { speaker: 'juno', text: 'New line.', end: true };
        d.pos[id] = [wrap.scrollLeft + 320, wrap.scrollTop + 40]; save(); rebuild();
      } }, '+ Add box'),
      el('span', { style: 'color:var(--dim)' }, 'Drag a card by its header. Drag a coloured dot onto a card to connect it (or use the dropdown). Grey = next line, cyan = choice, pink = present evidence, orange = wrong evidence, green = start.'));
    host.replaceChildren(el('h1', {}, conv), bar, wrap);
    redraw(); setTimeout(redraw);
    wrap.scrollLeft = keepX; wrap.scrollTop = keepY;
  };
}
