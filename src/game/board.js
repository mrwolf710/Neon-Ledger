import { BOARD } from './story.js';
import { frame } from '../ui/hud.js';

export const BOARDUI = {
  lineSeconds: 4.5,               // how long Juno's line stays up
  snapMs: 450,                    // wrong-link string flash
  dragStart: 6,
};

// --- Pure link logic (no DOM; see scripts/check-board.mjs) ---
const touches = (c, a, b) => c.needs.includes(a) || c.needs.includes(b);
function connected(needs, edges) {
  const group = new Map(needs.map((n) => [n, n]));
  const find = (x) => (group.get(x) === x ? x : find(group.get(x)));
  for (const [a, b] of edges) if (group.has(a) && group.has(b)) group.set(find(a), find(b));
  return new Set(needs.map(find)).size === 1;
}

export function createBoardLogic(data, hasFact) {
  const solved = new Set(), edges = new Map(), tries = new Map();
  let wrongIdx = 0;
  return {
    solved, edges, tries,
    // Returns { kind: 'same' | 'wrong' | 'partial' | 'solved', conclusion?, line?, hint? }.
    link(a, b) {
      if (a === b) return { kind: 'same' };
      const open = data.conclusions.filter((c) => !solved.has(c.id));
      const match = open.find((c) => c.needs.includes(a) && c.needs.includes(b));
      if (match) {
        const list = edges.get(match.id) ?? [];
        if (!list.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) list.push([a, b]);
        edges.set(match.id, list);
        if (connected(match.needs, list)) { solved.add(match.id); return { kind: 'solved', conclusion: match, line: match.line }; }
        return { kind: 'partial', conclusion: match, line: data.partialLine };
      }
      const owner = open.find((c) => touches(c, a, b));
      let hint = null;
      if (owner) {
        const n = (tries.get(owner.id) ?? 0) + 1;
        tries.set(owner.id, n);
        if (n % 3 === 0) hint = owner.needs.find((f) => f !== a && f !== b && hasFact(f)) ?? owner.needs.find(hasFact) ?? null;
      }
      return { kind: 'wrong', conclusion: owner, line: data.wrongLines[wrongIdx++ % data.wrongLines.length], hint };
    },
  };
}

const el = (tag, cls, parent, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};

// Deduction board: fact data cards on a holographic grid; drag a card onto another (or select two) to propose a link.
export function createBoard({ caseFile, hud }) {
  const logic = createBoardLogic(BOARD, (id) => caseFile.has(id));
  const root = el('div', '', document.body); root.id = 'board';
  const box = frame(el('div', 'bd-box', root));
  const head = el('div', 'bd-head', box);
  const titleBox = el('div', 'bd-titlebox', head);
  el('div', 'bd-title nameplate', titleBox, 'Deduction matrix');
  const status = el('div', 'bd-status', titleBox);
  const closeBtn = el('button', 'bd-close', head, '✕');
  const cardsEl = el('div', 'bd-cards', box);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'bd-strings'); box.appendChild(svg);
  const lineEl = frame(el('div', 'bd-line', box));
  el('span', 'who nameplate', lineEl, 'Juno');
  const lineTxt = el('span', '', lineEl);
  const foot = el('div', 'bd-foot', box);
  foot.innerHTML = '<span class="keycap">Drag</span>card onto card <span class="keycap">Arrows</span><span class="keycap">Space</span>pick two <span class="keycap">Esc</span>close';

  let isOpen = false, cursor = 0, first = null, drag = null, temp = null, flash = null, lineTimer = 0, cards = [], newId = null;
  const api = {
    get isOpen() { return isOpen; },
    onLock: null,   // (conclusion) when a link locks in; Stage 8 plays the ticking / chime
    onWrong: null,  // () when a link snaps back
    onUi: null,     // (kind) open / close sounds
    logic,
  };

  const center = (node) => {
    const b = box.getBoundingClientRect(), r = node.getBoundingClientRect();
    return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
  };
  const cardEl = (id) => cardsEl.querySelector(`[data-id="${id}"]`);

  function drawStrings() {
    svg.replaceChildren();
    const add = (a, b, cls) => {
      const A = cardEl(a), B = cardEl(b);
      if (!A || !B) return;
      const [x1, y1] = center(A), [x2, y2] = center(B);
      const l = document.createElementNS(svgNS, 'line');
      for (const [k, v] of Object.entries({ x1, y1, x2, y2, class: cls })) l.setAttribute(k, v);
      svg.appendChild(l);
      for (const [cx, cy] of [[x1, y1], [x2, y2]]) { // node dots where the string meets the card
        const dot = document.createElementNS(svgNS, 'circle');
        for (const [k, v] of Object.entries({ cx, cy, r: 5, class: `dot ${cls}` })) dot.setAttribute(k, v);
        svg.appendChild(dot);
      }
    };
    for (const [id, list] of logic.edges) for (const [a, b] of list) add(a, b, logic.solved.has(id) ? 'locked' : 'partial');
    if (flash) add(flash[0], flash[1], 'wrong');
    if (temp) {
      const A = cardEl(temp.from);
      if (A) {
        const [x1, y1] = center(A), b = box.getBoundingClientRect();
        const l = document.createElementNS(svgNS, 'line');
        for (const [k, v] of Object.entries({ x1, y1, x2: temp.x - b.left, y2: temp.y - b.top, class: 'temp' })) l.setAttribute(k, v);
        svg.appendChild(l);
      }
    }
  }

  function say(text) {
    lineTxt.textContent = text;
    lineEl.classList.add('on');
    clearTimeout(lineTimer);
    lineTimer = setTimeout(() => lineEl.classList.remove('on'), BOARDUI.lineSeconds * 1000);
  }

  function propose(a, b) {
    first = null;
    const r = logic.link(a, b);
    if (r.kind === 'same') { render(); return; }
    if (r.kind === 'wrong') {
      flash = [a, b]; api.onWrong?.();
      const title = (id) => caseFile.facts().find((f) => f.id === id)?.title;
      say(r.hint ? `${r.line} ${BOARD.hintLine.replace('{fact}', title(r.hint) ?? '…')}` : r.line);
      setTimeout(() => { flash = null; drawStrings(); }, BOARDUI.snapMs);
    } else {
      say(r.line);
      if (r.kind === 'solved') {
        caseFile.apply(r.conclusion.effects);
        newId = r.conclusion.result;
        api.onLock?.(r.conclusion);
      }
    }
    render();
  }

  function render() {
    const facts = caseFile.facts();
    cursor = Math.min(cursor, Math.max(0, facts.length - 1));
    cardsEl.replaceChildren(...facts.map((f, i) => {
      const d = el('div', 'bd-card', null);
      d.dataset.id = f.id;
      if (i === cursor) d.classList.add('cursor');
      if (f.id === first) d.classList.add('sel');
      if (f.source === 'Deduction board') d.classList.add('result');
      if (f.id === newId) d.classList.add('new');
      el('div', 'tag', d, f.source === 'Deduction board' ? 'CONCLUSION' : `FACT-${String(i + 1).padStart(2, '0')}`);
      el('div', 't', d, f.title); el('div', 'x', d, f.text);
      el('div', 'src', d, f.source);
      d.addEventListener('pointerdown', (e) => {
        e.preventDefault(); d.setPointerCapture(e.pointerId);
        drag = { from: f.id, x0: e.clientX, y0: e.clientY, moved: false };
      });
      d.addEventListener('pointermove', (e) => {
        if (!drag || drag.from !== f.id) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > BOARDUI.dragStart) drag.moved = true;
        if (drag.moved) { temp = { from: f.id, x: e.clientX, y: e.clientY }; drawStrings(); }
      });
      d.addEventListener('pointerup', (e) => {
        if (!drag || drag.from !== f.id) return;
        const dr = drag; drag = null; temp = null;
        if (dr.moved) {
          const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.bd-card');
          drawStrings();
          if (target && target.dataset.id !== f.id) propose(f.id, target.dataset.id);
        } else { cursor = i; pick(f.id); }
      });
      return d;
    }));
    if (!facts.length) cardsEl.innerHTML = '<div class="bd-empty">&gt; NO DATA. TALK TO PEOPLE. SCAN ECHOES.</div>';
    status.textContent = `FACTS ${facts.length} · LINKS ${logic.solved.size}/${BOARD.conclusions.length}`;
    cards = facts.map((f) => f.id);
    requestAnimationFrame(drawStrings);
  }

  // Select a card; the second selection proposes the link.
  function pick(id) {
    if (first === null) { first = id; render(); } else if (first === id) { first = null; render(); } else propose(first, id);
  }

  function moveCursor(dx, dy) {
    const nodes = [...cardsEl.querySelectorAll('.bd-card')];
    if (nodes.length < 2) return;
    const [cx, cy] = center(nodes[cursor]);
    let best = -1, bestScore = Infinity;
    nodes.forEach((n, i) => {
      if (i === cursor) return;
      const [x, y] = center(n), vx = x - cx, vy = y - cy, along = vx * dx + vy * dy;
      if (along <= 1) return;
      const score = along + 2 * Math.abs(vx * dy - vy * dx); // prefer straight ahead
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) { cursor = best; render(); }
  }

  closeBtn.addEventListener('click', () => api.close());
  window.addEventListener('resize', () => { if (isOpen) drawStrings(); });

  Object.assign(api, {
    open() { isOpen = true; first = null; newId = null; root.classList.add('on'); render(); api.onUi?.('confirm'); },
    close() { isOpen = false; drag = temp = null; root.classList.remove('on'); api.onUi?.('back'); },
    toggle() { if (isOpen) api.close(); else api.open(); },
    // Every frame while open.
    update(input) {
      if (!isOpen) return;
      const p = (a) => input.pressed(a);
      if (p('back') || p('pause')) { if (first !== null) { first = null; render(); } else api.close(); return; }
      if (p('board')) { api.close(); return; }
      if (p('left') || p('menuLeft')) moveCursor(-1, 0);
      if (p('right') || p('menuRight')) moveCursor(1, 0);
      if (p('up') || p('menuUp')) moveCursor(0, -1);
      if (p('down') || p('menuDown')) moveCursor(0, 1);
      if (p('interact') && cards[cursor]) pick(cards[cursor]);
    },
  });
  return api;
}
