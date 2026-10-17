import { BOARD, ENTRIES } from './story.ts';
import { frame } from '../ui/hud.ts';
import { createRng } from '../core/rng.ts';
import type { CaseFile } from './casefile.ts';
import type { BoardConclusion, BoardData } from '../types.ts';

export const BOARDUI = {
  lineSeconds: 4.5,               // how long Juno's line stays up
  snapMs: 450,                    // wrong-link string flash
  dragStart: 6,
  solveAfter: 3,                  // wrong links + hints before the Solve button appears
  hintGlowSeconds: 6,             // how long hinted cards glow
  approachMs: 500,                // match: the two cards float together
  sparks: 28, sparkMs: 600,       // match: spark shower
  holdMs: 350,                    // match: the new clue sits between the slots
  flyMs: 700,                     // match: the new clue flies to the top of the board
  solveStepMs: 1300,              // Solve: time per link (select the first card, then the second)
};

// --- Pure link logic (no DOM; see scripts/check-board.mjs) ---
export interface LinkResult { kind: 'same' | 'wrong' | 'partial' | 'solved'; conclusion?: BoardConclusion; line?: string; hint?: string | null }
export interface BoardLogic {
  solved: Set<string>; edges: Map<string, [string, string][]>; tries: Map<string, number>;
  link(a: string, b: string): LinkResult;
}
const touches = (c: BoardConclusion, a: string, b: string) => c.needs.includes(a) || c.needs.includes(b);
function connected(needs: string[], edges: [string, string][]) {
  const group = new Map<string, string>(needs.map((n): [string, string] => [n, n]));
  const find = (x: string): string => (group.get(x) === x ? x : find(group.get(x)!));
  for (const [a, b] of edges) if (group.has(a) && group.has(b)) group.set(find(a), find(b));
  return new Set(needs.map(find)).size === 1;
}

export function createBoardLogic(data: BoardData, hasFact: (id: string) => boolean): BoardLogic {
  const solved = new Set<string>(), edges = new Map<string, [string, string][]>(), tries = new Map<string, number>();
  let wrongIdx = 0;
  return {
    solved, edges, tries,
    // Returns { kind: 'same' | 'wrong' | 'partial' | 'solved', conclusion?, line?, hint? }.
    link(a: string, b: string): LinkResult {
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
      let hint: string | null = null;
      if (owner) {
        const n = (tries.get(owner.id) ?? 0) + 1;
        tries.set(owner.id, n);
        if (n % 3 === 0) hint = owner.needs.find((f) => f !== a && f !== b && hasFact(f)) ?? owner.needs.find(hasFact) ?? null;
      }
      return { kind: 'wrong', conclusion: owner, line: data.wrongLines[wrongIdx++ % data.wrongLines.length], hint };
    },
  };
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, parent?: Node | null, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};

// Deduction board: clue cards sit either side of a central ring. Put two cards in its slots (click/tap, drag, or Space) and press DEDUCE.
// Spent clues (used in a solved conclusion) fade into the archive row; conclusion cards stay on the sides, display only.
export interface Board {
  spent: () => Set<string>;
  readonly isOpen: boolean;
  onLock: ((conclusion: BoardConclusion) => void) | null;
  onWrong: (() => void) | null;
  onUi: ((kind: string) => void) | null;
  logic: BoardLogic;
  open(): void;
  close(): void;
  toggle(): void;
  update(input: { pressed(action: string): boolean; lastDevice?: string }): void;
}
export function createBoard({ caseFile, hud }: { caseFile: CaseFile; hud?: unknown }): Board {
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
  const fused = el('div', 'bd-fused', ring); // the new conclusion appears between the slots on a match
  const goBtn = el('button', 'bd-go', ring, 'DEDUCE'); // under the slots
  const rightEl = el('div', 'bd-cards', main);
  const archiveEl = el('div', 'bd-archive', box);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'bd-strings'); box.appendChild(svg);
  const lineEl = frame(el('div', 'bd-line', box));
  el('span', 'who nameplate', lineEl, 'Juno');
  const lineTxt = el('span', '', lineEl);
  const foot = el('div', 'bd-foot', box);
  foot.innerHTML = '<span class="keycap">Click</span><span class="keycap">Drag</span>card into the ring <span class="keycap">Arrows</span><span class="keycap">Space</span>pick / deduce <span class="keycap">H</span><span class="keycap">Y</span>hint <span class="keycap">RT</span>solve <span class="keycap">Esc</span>clear / close';

  let isOpen = false, cursor = 0, drag: { from: string; x0: number; y0: number; moved: boolean } | null = null, temp: { from: string; x: number; y: number } | null = null, lineTimer: ReturnType<typeof setTimeout> | 0 = 0, cards: string[] = [], newId: string | null = null;
  let arriving: string | null = null, misses = 0, hinted = new Set<string>(), hintTimer = 0, solving = false, busy = false;
  const sparkRng = createRng(7).fork('sparks'), slots: (string | null)[] = [null, null], failed = new Map<string, number>(); // failed: "a|b" -> how many facts Juno held when it failed; a new clue can make an old pair work, so only an unchanged board counts as "already tried"
  const hintCount = new Map<string, number>();
  const api = {
    spent: () => spentClues(), // clues the solved conclusions have used up (the case file's picker leaves them out)
    get isOpen() { return isOpen; },
    onLock: null as Board['onLock'],   // (conclusion) when a link locks in; Stage 8 plays the ticking / chime
    onWrong: null as Board['onWrong'],  // () when a link snaps back
    onUi: null as Board['onUi'],     // (kind) open / close sounds
    logic,
  } as Board;

  const center = (node: Element) => {
    const b = box.getBoundingClientRect(), r = node.getBoundingClientRect();
    return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
  };
  const cardEl = (id: string) => main.querySelector(`.bd-card[data-id="${id}"]`);
  const title = (id: string) => caseFile.facts().find((f) => f.id === id)?.title;

  // Threads from each filled slot to the DEDUCE button, plus the line trailing a dragged card.
  function drawStrings() {
    svg.replaceChildren();
    const line = (x1: number, y1: number, x2: number, y2: number, cls: string) => {
      const l = document.createElementNS(svgNS, 'line');
      for (const [k, v] of Object.entries({ x1, y1, x2, y2, class: cls })) l.setAttribute(k, String(v));
      svg.appendChild(l);
    };
    const cls = ring.dataset.state === 'bad' ? 'wrong' : 'locked';
    if (slots[0] && slots[1] && !['ok', 'merge'].includes(ring.dataset.state!)) { const [x1, y1] = center(slotEls[0]), [x2, y2] = center(slotEls[1]), hw = slotEls[0].offsetWidth / 2; line(x1 + hw, y1, x2 - hw, y2, cls); /* edge to edge, never across the text */ }
    const A = temp && cardEl(temp.from);
    if (A) { const [x1, y1] = center(A), b = box.getBoundingClientRect(); line(x1, y1, temp!.x - b.left, temp!.y - b.top, 'temp'); }
  }

  function say(text: string) {
    lineTxt.textContent = text;
    lineEl.classList.add('on');
    clearTimeout(lineTimer);
    lineTimer = setTimeout(() => lineEl.classList.remove('on'), BOARDUI.lineSeconds * 1000);
  }

  // Long titles get a smaller font so they always fit the slot (size in cqw of the ring).
  const fit = (node: HTMLElement, text: string) => { node.textContent = text; node.style.fontSize = `${Math.max(2.2, Math.min(4.4, Math.sqrt(560 / Math.max(1, text.length))))}cqw`; };
  const clearSlots = () => {
    slots[0] = slots[1] = null; ring.dataset.state = ''; busy = false;
    for (const n of [...slotEls, fused]) { n.getAnimations().forEach((a) => a.cancel()); n.style.visibility = ''; }
    render();
  };

  function place(id: string) {
    if (busy || slots.includes(id)) return;
    const i = slots.indexOf(null);
    if (i < 0) return;
    slots[i] = id; api.onUi?.('move'); render();
  }

  // Solved: the two cards float together, burst into sparks, the new clue appears between them, then flies to the top-right slot of the board.
  function merge() {
    const rr = ring.getBoundingClientRect(), cx = rr.left + rr.width / 2, cy = rr.top + rr.height * 0.43;
    const tgt = main.querySelector('.arriving');
    slotEls.forEach((s) => {
      const r = s.getBoundingClientRect();
      s.animate([{ transform: 'none' }, { transform: `translate(${cx - r.left - r.width / 2}px, ${cy - r.top - r.height / 2}px) scale(0.6)`, opacity: 0.4 }],
        { duration: BOARDUI.approachMs, easing: 'ease-in', fill: 'forwards' });
    });
    setTimeout(() => {
      slotEls.forEach((s) => { s.style.visibility = 'hidden'; });
      for (let i = 0; i < BOARDUI.sparks; i++) {
        const sp = el('div', 'bd-spark', ring), ang = sparkRng.range(0, Math.PI * 2), dist = sparkRng.range(0.12, 0.5) * rr.width;
        sp.style.background = ['#fff', '#1fd6e8', '#e0217d', '#39ff88'][i % 4];
        sp.animate([{ transform: 'translate(-50%, -50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0.2)`, opacity: 0 }],
          { duration: BOARDUI.sparkMs, easing: 'ease-out' }).onfinish = () => sp.remove();
      }
      ring.dataset.state = 'ok'; // shows the new clue between the slots
    }, BOARDUI.approachMs);
    setTimeout(() => {
      const a = fused.getBoundingClientRect(), t = tgt?.getBoundingClientRect();
      if (!t) { clearSlots(); return; }
      fused.animate([{ transform: 'none' }, { transform: `translate(${t.left + t.width / 2 - a.left - a.width / 2}px, ${t.top + t.height / 2 - a.top - a.height / 2}px) scale(${t.width / a.width})`, opacity: 0.9 }],
        { duration: BOARDUI.flyMs, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => { arriving = null; clearSlots(); };
    }, BOARDUI.approachMs + BOARDUI.sparkMs + BOARDUI.holdMs);
  }

  function deduce() {
    const [a, b] = slots;
    if (!a || !b || busy) return;
    busy = true;
    const key = [a, b].sort().join('|');
    if (failed.get(key) === caseFile.facts().length) { ring.dataset.state = 'bad'; say(`⚠ Already tried those two. ${BOARD.wrongLines[0]}`); api.onWrong?.(); }
    else {
      const r = logic.link(a, b);
      if (r.kind === 'solved') {
        ring.dataset.state = 'merge'; say(r.line!);
        caseFile.apply(r.conclusion!.effects);
        fit(fused, title(r.conclusion!.result) ?? '');
        misses = 0; hintCount.clear(); hinted.clear();
        newId = arriving = r.conclusion!.result;
        api.onLock?.(r.conclusion!);
        render(); merge(); return;
      } else {
        failed.set(key, caseFile.facts().length); misses++; ring.dataset.state = 'bad'; api.onWrong?.();
        say(r.hint ? `${r.line} ${BOARD.hintLine.replace('{fact}', title(r.hint) ?? '…')}` : r.line!);
      }
    }
    render();
    setTimeout(clearSlots, BOARDUI.snapMs);
  }

  const isResult = (f: { source: string }) => f.source === 'Deduction board';
  // A clue is spent once a solved conclusion used it, unless another unsolved conclusion still needs it (gloved_hand serves two).
  const spentClues = () => {
    const spent = new Set<string>(), later = new Set(BOARD.conclusions.filter((c) => !logic.solved.has(c.id)).flatMap((c) => c.needs));
    for (const c of BOARD.conclusions) if (logic.solved.has(c.id)) c.needs.forEach((n) => { if (!later.has(n)) spent.add(n); });
    return spent;
  };
  const usable = new Set(BOARD.conclusions.flatMap((c) => c.needs)); // a conclusion card can be a clue for a later one (chapter 2 tier two)
  function render() {
    const all = caseFile.facts(), facts = [...all].reverse().filter((f) => caseFile.chapterOf(f) === caseFile.chapter()); // an earlier chapter's clues leave the board when the next chapter starts // newest first: the latest clue sits at the top
    const spent = spentClues();
    cards = facts.filter((f) => (!isResult(f) || usable.has(f.id)) && !spent.has(f.id) && !slots.includes(f.id)).map((f) => f.id);
    cursor = Math.max(0, Math.min(cursor, cards.length - 1));
    const side: HTMLElement[][] = [[], []];
    // A card sitting in a ring slot leaves an invisible placeholder behind, so every other card keeps its place and a failed pair puts it back exactly where it was.
    facts.filter((f) => !spent.has(f.id)).forEach((f, i) => {
      const d = el('div', 'bd-card', null), live = cards.includes(f.id);
      if (slots.includes(f.id)) d.classList.add('ghost');
      d.dataset.id = f.id;
      d.title = f.text;
      if (live && cards[cursor] === f.id) d.classList.add('cursor');
      if (isResult(f)) d.classList.add('result');
      if (f.id === newId) d.classList.add('new');
      if (f.id === arriving) d.classList.add('arriving');
      if (hinted.has(f.id)) d.classList.add('hinted');
      el('div', 'tag', d, isResult(f) ? 'CONCLUSION' : `FACT-${String(all.indexOf(f) + 1).padStart(2, '0')}`);
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
      side[(i + 1) % 2].push(d); // newest (i = 0) goes to the right column, top
    });
    leftEl.replaceChildren(...side[0]); rightEl.replaceChildren(...side[1]);
    slotEls.forEach((s, i) => {
      s.replaceChildren(); s.classList.toggle('full', !!slots[i]);
      s.onclick = () => { if (!busy && slots[i]) { slots[i] = null; render(); } }; // click a slot to take the card back
      fit(el('div', 't', s), slots[i] ? title(slots[i]!)! : i ? 'CLUE B' : 'CLUE A');
    });
    const ready = !!(slots[0] && slots[1]);
    ring.classList.toggle('ready', ready); goBtn.disabled = !ready || busy;
    archiveEl.replaceChildren(...facts.filter((f) => spent.has(f.id)).map((f) => el('div', 'bd-spent', null, f.title)));
    archiveEl.style.display = spent.size ? '' : 'none';
    if (!facts.length) leftEl.innerHTML = '<div class="bd-empty">&gt; NO DATA. TALK TO PEOPLE. SCAN ECHOES.</div>';
    const ch2 = caseFile.hasFlag('chapter1_done'), mine = BOARD.conclusions.filter((c) => !ch2 || c.needs.every((n) => ENTRIES[n]?.ch2)); // chapter 2 counts only its own links
    status.textContent = `FACTS ${facts.length} · LINKS ${mine.filter((c) => logic.solved.has(c.id)).length}/${mine.length}`;
    solveBtn.style.display = misses >= BOARDUI.solveAfter && nextOpen() ? '' : 'none';
    main.querySelector('.cursor')?.scrollIntoView({ block: 'nearest' }); // pad / keys moving the cursor scroll the columns
    requestAnimationFrame(drawStrings);
  }

  // The next conclusion Juno could draw: the first unsolved one whose facts she holds.
  const nextOpen = () => { const spent = spentClues(), ch2 = caseFile.hasFlag('chapter1_done'); // chapter 1's clues leave the board in chapter 2, so those links are no longer offered
    return BOARD.conclusions.find((c) => !logic.solved.has(c.id) && [...c.needs, ...(c.requires ?? [])].every((f) => caseFile.has(f)) && c.needs.every((n) => !spent.has(n) && (!ch2 || ENTRIES[n]?.ch2))); };
  const factTitle = (id: string) => title(id) ?? '…';

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

  function moveCursor(dx: number, dy: number) {
    const nodes = cards.map(cardEl).filter(Boolean) as Element[];
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
    update(input: { pressed(action: string): boolean; lastDevice?: string }) {
      if (!isOpen) return;
      const p = (a: string) => input.pressed(a);
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
