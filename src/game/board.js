import { BOARD } from './story.js';
import { frame } from '../ui/hud.js';

export const BOARDUI = {
  lineSeconds: 4.5,               // how long Juno's line stays up
  snapMs: 450,                    // wrong-link string flash
  dragStart: 6,
  solveAfter: 3,                  // wrong links + hints before the Solve button appears
  hintGlowSeconds: 6,             // how long hinted cards glow
  solveStepMs: 1300,              // Solve: time per link (select the first card, then the second)
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
      const open = data.conclusions.filter((c) => !solved.has(c.id) && (c.requires ?? []).every(hasFact));
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

// Deduction board: clue cards sit either side of a central ring. Put two cards in its slots (click/tap, drag, or Space) and press DEDUCE.
// Spent clues (used in a solved conclusion) fade into the archive row; conclusion cards stay on the sides, display only.
export function createBoard({ caseFile, hud }) {
  const logic = createBoardLogic(BOARD, (id) => caseFile.has(id));
  const root = el('div', '', document.body); root.id = 'board';
  const box = frame(el('div', 'bd-box', root));
  const head = el('div', 'bd-head', box);
  const titleBox = el('div', 'bd-titlebox', head);
  el('div', 'bd-title nameplate', titleBox, 'Deduction matrix');
  const status = el('div', 'bd-status', titleBox);
  const right = el('div', 'bd-right', head);
  const solveBtn = el('button', 'bd-tool', right, 'Solve'); solveBtn.style.display = 'none'; // appears after BOARDUI.solveAfter misses
  const hintBtn = el('button', 'bd-tool', right, 'Hint');
  const closeBtn = el('button', 'bd-close', right, '✕');
  const main = el('div', 'bd-main', box);
  const leftEl = el('div', 'bd-cards', main);
  const ring = el('div', 'bd-ring', main);
  const slotEls = [el('div', 'bd-slot', ring), el('div', 'bd-slot', ring)];
  const goBtn = el('button', 'bd-go', ring, 'DEDUCE'); // DOM order puts it last; CSS grid puts it between the slots
  const rightEl = el('div', 'bd-cards', main);
  const archiveEl = el('div', 'bd-archive', box);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'bd-strings'); box.appendChild(svg);
  const lineEl = frame(el('div', 'bd-line', box));
  el('span', 'who nameplate', lineEl, 'Juno');
  const lineTxt = el('span', '', lineEl);
  const foot = el('div', 'bd-foot', box);
  foot.innerHTML = '<span class="keycap">Click</span><span class="keycap">Drag</span>card into the ring <span class="keycap">Arrows</span><span class="keycap">Space</span>pick / deduce <span class="keycap">H</span><span class="keycap">Y</span>hint <span class="keycap">RT</span>solve <span class="keycap">Esc</span>clear / close';

  let isOpen = false, cursor = 0, drag = null, temp = null, lineTimer = 0, cards = [], newId = null;
  let misses = 0, hinted = new Set(), hintTimer = 0, solving = false, busy = false;
  const slots = [null, null], failed = new Set(); // failed: "a|b" pairs already tried
  const hintCount = new Map();
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
  const cardEl = (id) => main.querySelector(`.bd-card[data-id="${id}"]`);
  const title = (id) => caseFile.facts().find((f) => f.id === id)?.title;

  // Threads from each filled slot to the DEDUCE button, plus the line trailing a dragged card.
  function drawStrings() {
    svg.replaceChildren();
    const line = (x1, y1, x2, y2, cls) => {
      const l = document.createElementNS(svgNS, 'line');
      for (const [k, v] of Object.entries({ x1, y1, x2, y2, class: cls })) l.setAttribute(k, v);
      svg.appendChild(l);
    };
    const [gx, gy] = center(goBtn), cls = ring.dataset.state === 'bad' ? 'wrong' : 'locked';
    slots.forEach((id, i) => { if (id) { const [x, y] = center(slotEls[i]); line(x, y, gx, gy, cls); } });
    const A = temp && cardEl(temp.from);
    if (A) { const [x1, y1] = center(A), b = box.getBoundingClientRect(); line(x1, y1, temp.x - b.left, temp.y - b.top, 'temp'); }
  }

  function say(text) {
    lineTxt.textContent = text;
    lineEl.classList.add('on');
    clearTimeout(lineTimer);
    lineTimer = setTimeout(() => lineEl.classList.remove('on'), BOARDUI.lineSeconds * 1000);
  }

  const clearSlots = () => { slots[0] = slots[1] = null; ring.dataset.state = ''; busy = false; render(); };

  function place(id) {
    if (busy || slots.includes(id)) return;
    const i = slots.indexOf(null);
    if (i < 0) return;
    slots[i] = id; api.onUi?.('move'); render();
  }

  function deduce() {
    const [a, b] = slots;
    if (!a || !b || busy) return;
    busy = true;
    const key = [a, b].sort().join('|');
    if (failed.has(key)) { ring.dataset.state = 'bad'; say(`⚠ Already tried those two. ${BOARD.wrongLines[0]}`); api.onWrong?.(); }
    else {
      const r = logic.link(a, b);
      if (r.kind === 'solved') {
        ring.dataset.state = 'ok'; say(r.line);
        caseFile.apply(r.conclusion.effects);
        misses = 0; hintCount.clear(); hinted.clear();
        newId = r.conclusion.result;
        api.onLock?.(r.conclusion);
      } else {
        failed.add(key); misses++; ring.dataset.state = 'bad'; api.onWrong?.();
        say(r.hint ? `${r.line} ${BOARD.hintLine.replace('{fact}', title(r.hint) ?? '…')}` : r.line);
      }
    }
    render();
    setTimeout(clearSlots, BOARDUI.snapMs);
  }

  const isResult = (f) => f.source === 'Deduction board';
  function render() {
    const facts = caseFile.facts();
    const spent = new Set();
    for (const c of BOARD.conclusions) if (logic.solved.has(c.id)) c.needs.forEach((n) => spent.add(n));
    cards = facts.filter((f) => !isResult(f) && !spent.has(f.id) && !slots.includes(f.id)).map((f) => f.id);
    cursor = Math.max(0, Math.min(cursor, cards.length - 1));
    const side = [[], []];
    facts.filter((f) => !spent.has(f.id) && !slots.includes(f.id)).forEach((f, i) => {
      const d = el('div', 'bd-card', null), live = cards.includes(f.id);
      d.dataset.id = f.id;
      if (live && cards[cursor] === f.id) d.classList.add('cursor');
      if (isResult(f)) d.classList.add('result');
      if (f.id === newId) d.classList.add('new');
      if (hinted.has(f.id)) d.classList.add('hinted');
      el('div', 'tag', d, isResult(f) ? 'CONCLUSION' : `FACT-${String(facts.indexOf(f) + 1).padStart(2, '0')}`);
      el('div', 't', d, f.title); el('div', 'x', d, f.text);
      el('div', 'src', d, f.source);
      if (live) {
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
          const onRing = dr.moved ? document.elementFromPoint(e.clientX, e.clientY)?.closest('.bd-ring') : true; // a plain click goes to the next free slot
          drawStrings();
          if (onRing) place(f.id);
        });
      }
      side[i % 2].push(d);
    });
    leftEl.replaceChildren(...side[0]); rightEl.replaceChildren(...side[1]);
    slotEls.forEach((s, i) => {
      s.replaceChildren(); s.classList.toggle('full', !!slots[i]);
      s.onclick = () => { if (!busy && slots[i]) { slots[i] = null; render(); } }; // click a slot to take the card back
      el('div', 't', s, slots[i] ? title(slots[i]) : i ? 'CLUE B' : 'CLUE A');
    });
    const ready = !!(slots[0] && slots[1]);
    ring.classList.toggle('ready', ready); goBtn.disabled = !ready || busy;
    archiveEl.replaceChildren(...facts.filter((f) => spent.has(f.id)).map((f) => el('div', 'bd-spent', null, f.title)));
    archiveEl.style.display = spent.size ? '' : 'none';
    if (!facts.length) leftEl.innerHTML = '<div class="bd-empty">&gt; NO DATA. TALK TO PEOPLE. SCAN ECHOES.</div>';
    status.textContent = `FACTS ${facts.length} · LINKS ${logic.solved.size}/${BOARD.conclusions.length}`;
    solveBtn.style.display = misses >= BOARDUI.solveAfter && nextOpen() ? '' : 'none';
    main.querySelector('.cursor')?.scrollIntoView({ block: 'nearest' }); // pad / keys moving the cursor scroll the columns
    requestAnimationFrame(drawStrings);
  }

  // The next conclusion Juno could draw: the first unsolved one whose facts she holds.
  const nextOpen = () => BOARD.conclusions.find((c) => !logic.solved.has(c.id) && [...c.needs, ...(c.requires ?? [])].every((f) => caseFile.has(f)));
  const factTitle = (id) => title(id) ?? '…';

  // Hint: first press names one clue, the next the pair; those cards glow.
  function hint() {
    const c = nextOpen();
    if (!c) { say('Nothing more to connect with what I have. I need more evidence.'); return; }
    const n = Math.min(c.needs.length, (hintCount.get(c.id) ?? 0) + 1);
    hintCount.set(c.id, n); misses++;
    const ids = c.needs.slice(0, n);
    hinted = new Set(ids);
    clearTimeout(hintTimer); hintTimer = setTimeout(() => { hinted.clear(); render(); }, BOARDUI.hintGlowSeconds * 1000);
    const t = ids.map((f) => `“${factTitle(f)}”`);
    say(n === 1 ? BOARD.hintLine.replace('{fact}', factTitle(ids[0])) : `${t.slice(0, -1).join(', ')} and ${t.at(-1)} belong together.`);
    const k = cards.indexOf(ids[0]); if (k >= 0) cursor = k;
    render();
  }

  // Solve: Juno fills the ring with the right pair and presses DEDUCE herself.
  function solve() {
    const c = nextOpen();
    if (!c || solving || busy) return;
    solving = true; slots[0] = slots[1] = null;
    const [a, b] = c.needs, step = BOARDUI.solveStepMs / 2;
    setTimeout(() => place(a), 0);
    setTimeout(() => place(b), step);
    setTimeout(() => { deduce(); solving = false; }, step * 2);
  }

  function moveCursor(dx, dy) {
    const nodes = cards.map(cardEl).filter(Boolean);
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

  for (const c of [leftEl, rightEl]) c.addEventListener('scroll', () => drawStrings());
  closeBtn.addEventListener('click', () => api.close());
  hintBtn.addEventListener('click', () => hint());
  solveBtn.addEventListener('click', () => solve());
  goBtn.addEventListener('click', () => deduce());
  window.addEventListener('resize', () => { if (isOpen) drawStrings(); });

  Object.assign(api, {
    open() { isOpen = true; slots[0] = slots[1] = null; busy = false; ring.dataset.state = ''; newId = null; hinted.clear(); root.classList.add('on'); render(); api.onUi?.('confirm'); },
    close() { isOpen = false; drag = temp = null; root.classList.remove('on'); api.onUi?.('back'); },
    toggle() { if (isOpen) api.close(); else api.open(); },
    // Every frame while open.
    update(input) {
      if (!isOpen) return;
      const p = (a) => input.pressed(a);
      if (p('back') || p('pause')) { if (slots[0] || slots[1]) { if (!busy) { slots[0] = slots[1] = null; render(); } } else api.close(); return; }
      if (p('board')) { api.close(); return; }
      if (p('left') || p('menuLeft')) moveCursor(-1, 0);
      if (p('right') || p('menuRight')) moveCursor(1, 0);
      if (p('up') || p('menuUp')) moveCursor(0, -1);
      if (p('down') || p('menuDown')) moveCursor(0, 1);
      if (p('hideControls') || (p('caseFile') && input.lastDevice === 'gamepad')) hint(); // H on the keyboard, Y / Triangle on a pad (the case file button, unused while the board is open)
      if (p('solve') && solveBtn.style.display !== 'none') solve(); // right trigger, once the Solve button has appeared
      if (p('interact')) { if (slots[0] && slots[1]) deduce(); else if (cards[cursor]) place(cards[cursor]); }
    },
  });
  return api;
}
