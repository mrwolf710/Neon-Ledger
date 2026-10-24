// node scripts/check-order.mjs: plays the story's conversations in EVERY order (examines, echo scans, board links, talking to people) and fails if some order leaves the
// chapter unfinishable (a soft-lock), e.g. a conversation that sets a flag which hides a question the story still needs. Chapters 1 and 2 (the rest is scene-driven in beats.ts).
import { strict as assert } from 'node:assert';
const S = await import('../src/game/story.ts');
const { CONVERSATIONS, conversationFor, BOARD } = S;

const holds = (c, st) => !c || ((!c.flag || st.flags.has(c.flag)) && (!c.notFlag || !st.flags.has(c.notFlag)) && (!c.fact || st.facts.has(c.fact)) && (!c.notFact || !st.facts.has(c.notFact)));
const clone = (st) => ({ flags: new Set(st.flags), facts: new Set(st.facts), visits: { ...st.visits } });
const key = (st) => [...st.flags].sort().join(',') + '|' + [...st.facts].sort().join(',') + '|' + Object.entries(st.visits).sort().map(([k, v]) => k + v).join(',');
const apply = (st, effects = []) => { for (const e of effects) { if (e.setFlag) st.flags.add(e.setFlag); if (e.addFact) st.facts.add(e.addFact); if (e.addPerson) st.facts.add(e.addPerson); } };

// All possible end states of a conversation (each distinct path of choices).
function playConv(id, st0) {
  const conv = CONVERSATIONS[id];
  if (!conv) return [{ st: st0, note: 'MISSING ' + id }];
  const out = new Map();
  const start = Array.isArray(conv.start) ? conv.start.find((s) => holds(s.if, st0))?.node : conv.start;
  const walk = (nid, st, depth, seen) => {
    if (depth > 60) return;
    const n = conv.nodes[nid];
    if (!n) { out.set(key(st), { st, note: 'DANGLING ' + nid }); return; }
    const s = clone(st); apply(s, n.effects);
    const opts = [];
    for (const c of n.choices ?? []) if (holds(c.if, s)) opts.push({ c });
    if (n.present && s.facts.size) for (const f of s.facts) opts.push({ f });
    if (!opts.length) {
      if (n.next) return walk(n.next, s, depth + 1, seen);
      out.set(key(s), { st: s }); return;
    }
    // a node with options: next (if any) is not taken; the player picks an option
    for (const o of opts) {
      if (o.c) {
        const s2 = clone(s); apply(s2, o.c.effects);
        if (o.c.next) { const tag = nid + '>' + o.c.next + key(s2); if (seen.has(tag)) continue; walk(o.c.next, s2, depth + 1, new Set([...seen, tag])); } else out.set(key(s2), { st: s2 });
      } else {
        const t = n.present[o.f];
        if (t) walk(t, s, depth + 1, seen); // wrong item returns to the same menu: no state change
      }
    }
    if (!opts.some((o) => o.c) && !n.next) out.set(key(s), { st: s }); // only present options: the player can also back out
  };
  walk(start, st0, 0, new Set());
  return [...out.values()];
}


const CHAPTERS = [
  { name: 'chapter 1 (the Sable to the chip)', npcs: ['mamaTeo', 'kit'], conclusions: [0, 4], init: ['visited_street'],
    goal: (st) => st.flags.has('kit_coat') && st.flags.has('ex_capsule'),   // then the chip scene plays
    extra: (st, mk) => { // examining and echo scans are open from the start; the capsule needs Kit's key (conversation ex_capsule decides)
      mk('examine port', (s) => { Object.assign(s, playConv('ex_port', s)[0].st); });
      mk('echo teo_back_room', (s) => { s.facts.add('teo_back_room'); s.facts.add('two_voices'); });
      mk('echo alley_echo', (s) => { s.facts.add('alley_echo'); s.facts.add('gloved_hand'); });
      mk('echo kit_echo', (s) => { s.facts.add('kit_echo'); s.facts.add('kit_outside'); });
      mk('examine capsule', (s) => { Object.assign(s, playConv('ex_capsule', s)[0].st); });
    } },
  { name: 'chapter 2 (the Exchange to Locker 9)', npcs: ['vesper', 'mari', 'lux', 'tobbo', 'gutter', 'pim', 'bolt', 'vendor', 'dealer'], conclusions: [4, 8], init: ['visited_street', 'chapter1_done'],
    goal: (st) => st.flags.has('locker_ok'), skip: (npc, st) => npc === 'dealer' && !st.flags.has('dealer_open') || npc === 'vendor', extra: () => {} },
];

let failed = 0;
for (const ch of CHAPTERS) {
  const events = (st) => {
    const ev = [], mk = (label, f) => { const s = clone(st); f(s); ev.push({ label, st: s }); };
    ch.extra(st, mk);
    for (const c of BOARD.conclusions.slice(...ch.conclusions)) if (c.needs.every((f) => st.facts.has(f)) && (c.requires ?? []).every((f) => st.facts.has(f)) && !st.facts.has(c.result)) mk('board ' + c.id, (s) => apply(s, c.effects));
    for (const npc of ch.npcs) {
      if (ch.skip?.(npc, st)) continue;
      const visit = (st.visits[npc] ?? 0) + 1;
      const id = conversationFor(npc, visit, { has: (f) => st.facts.has(f), talked: (p) => (st.visits[p] ?? 0) > 0, flag: (f) => st.flags.has(f) });
      for (const r of playConv(id, st)) { const s = clone(r.st); s.visits[npc] = 1; ev.push({ label: `talk ${npc} [${id}]${r.note ? ' ' + r.note : ''}`, st: s }); }
    }
    return ev;
  };
  const init = { flags: new Set(ch.init), facts: new Set(), visits: {} };
  const seen = new Map([[key(init), { st: init, prev: null, via: 'start' }]]), edges = new Map(), queue = [init];
  while (queue.length) {
    const st = queue.shift(), k = key(st), out = [];
    for (const e of events(st)) { const k2 = key(e.st); out.push(k2); if (!seen.has(k2)) { seen.set(k2, { st: e.st, prev: k, via: e.label }); queue.push(e.st); } }
    edges.set(k, out);
    assert(seen.size < 300000, 'state space too large');
  }
  const rev = new Map();
  for (const [k, outs] of edges) for (const o of outs) { if (!rev.has(o)) rev.set(o, []); rev.get(o).push(k); }
  const good = new Set(), q = [];
  for (const [k, v] of seen) if (ch.goal(v.st)) { good.add(k); q.push(k); }
  while (q.length) { const k = q.pop(); for (const p of rev.get(k) ?? []) if (!good.has(p)) { good.add(p); q.push(p); } }
  const bad = [...seen.keys()].filter((k) => !good.has(k));
  const path = (k) => { const p = []; while (k) { const v = seen.get(k); p.push(v.via); k = v.prev; } return p.reverse(); };
  if (!good.size) { console.log(`${ch.name}: the goal is never reached`); failed++; continue; }
  if (bad.length) {
    failed++; bad.sort((a, b) => path(a).length - path(b).length);
    console.log(`${ch.name}: ${bad.length} of ${seen.size} states can never finish. Shortest:\n  ${path(bad[0]).join(' -> ')}\n  flags: ${[...seen.get(bad[0]).st.flags].join(',')}`);
  } else console.log(`${ch.name}: ${seen.size} states, every one can finish`);
}
assert.equal(failed, 0, 'order soft-lock found');
console.log('order ok');
