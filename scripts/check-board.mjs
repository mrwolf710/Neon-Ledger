// node scripts/check-board.mjs — link logic of the deduction board (pairs, trios, wrong links, hints).
import assert from 'node:assert';
import { createBoardLogic } from '../src/game/board.js';
import { BOARD } from '../src/game/story.js';

const known = new Set(['a', 'b', 'c', 'x', 'door_unlocked', 'two_voices', 'junk']);
const data = {
  ...BOARD,
  conclusions: [...BOARD.conclusions, { id: 'trio', needs: ['a', 'b', 'c'], result: 'r', line: 'trio!', effects: [] }],
};
const L = () => createBoardLogic(data, (id) => known.has(id));

let l = L();
assert.equal(l.link('door_unlocked', 'door_unlocked').kind, 'same');
assert.equal(l.link('door_unlocked', 'two_voices').kind, 'solved', 'the story pair locks on one link');
assert.equal(l.link('door_unlocked', 'two_voices').kind, 'wrong', 'a solved conclusion no longer accepts links');

l = L();
assert.equal(l.link('a', 'b').kind, 'partial', 'trio needs more than one link');
assert.equal(l.link('a', 'b').kind, 'partial', 'repeating a link adds nothing');
assert.equal(l.link('b', 'c').kind, 'solved', 'trio solved once connected');

l = L();
const r = [l.link('a', 'x'), l.link('a', 'junk'), l.link('c', 'x')];
assert.ok(r.every((q) => q.kind === 'wrong'), 'wrong links');
assert.equal(r[0].hint, null); assert.equal(r[1].hint, null);
assert.ok(['b', 'c', 'a'].includes(r[2].hint) && r[2].hint !== 'c' && r[2].hint !== 'x', `3rd miss on the trio hints another needed fact, got ${r[2].hint}`);
assert.equal(l.link('x', 'junk').hint, null, 'links touching no conclusion never hint');
assert.equal(new Set([l.link('x', 'junk').line, l.link('x', 'junk').line]).size, 2, 'wrong lines rotate');
console.log('board ok');

// Chapter 2: six clues -> three level-1 pairs -> a level-2 pair, in any order of discovery (docs/chapter-2.md).
{
  const have = new Set(['echo_refused', 'suit_argument', 'locker_receipt', 'locker_rental', 'suit_gossip', 'bureau_woman']);
  const l2 = createBoardLogic(BOARD, (id) => have.has(id));
  const add = (r) => { if (r.kind === 'solved') have.add(r.conclusion.result); return r; };
  assert.equal(add(l2.link('locker_rental', 'locker_receipt')).kind, 'solved', 'locker pair, either order');
  assert.equal(l2.link('locker_rented', 'echo_hidden').kind, 'wrong', 'tier two needs both level-1 results first');
  assert.equal(add(l2.link('suit_argument', 'echo_refused')).kind, 'solved', 'echo pair');
  const c4 = add(l2.link('echo_hidden', 'locker_rented'));
  assert.equal(c4.kind, 'solved', 'tier two locks'); assert.ok(c4.conclusion.effects.some((e) => e.setFlag === 'dealer_open'), 'it opens the dealer');
  assert.equal(add(l2.link('bureau_woman', 'suit_gossip')).kind, 'solved', 'optional pair');
  assert.equal(l2.link('echo_refused', 'bureau_woman').kind, 'wrong', 'crossing the pairs is wrong');
}

// Chapter 1: six clues -> three pairs -> a level-2 pair (the same shape as chapter 2).
{
  const have = new Set(['door_unlocked', 'two_voices', 'burned_port', 'gloved_hand', 'kit_outside', 'kit_name']);
  const l1 = createBoardLogic(BOARD, (id) => have.has(id));
  const add = (r) => { if (r.kind === 'solved') have.add(r.conclusion.result); return r; };
  assert.equal(l1.link('burned_port', 'door_unlocked').kind, 'wrong', 'crossing pairs is wrong');
  assert.equal(add(l1.link('door_unlocked', 'two_voices')).kind, 'solved', 'key pair');
  assert.equal(l1.link('override_used', 'kit_alley').kind, 'wrong', 'level two needs both level-1 results');
  assert.equal(add(l1.link('gloved_hand', 'burned_port')).kind, 'solved', 'override pair, either order');
  assert.equal(add(l1.link('kit_name', 'kit_outside')).kind, 'solved', 'Kit pair');
  const last = add(l1.link('override_used', 'kit_alley'));
  assert.equal(last.kind, 'solved', 'level two locks'); assert.ok(last.conclusion.effects.some((e) => e.setFlag === 'kit_deduced'), 'it names Kit');
}

// Chapter 3 (the Bureau): six clues in any order -> three pairs -> a level-2 pair that unlocks the way out.
{
  const have = new Set(['wipe_signature', 'clean_closes', 'line9_arrival', 'override_signed', 'cell_message', 'dex_closed_early']);
  const l3 = createBoardLogic(BOARD, (id) => have.has(id));
  const add = (r) => { if (r.kind === 'solved') have.add(r.conclusion.result); return r; };
  assert.equal(l3.link('wipe_signature', 'override_signed').kind, 'wrong', 'crossing pairs is wrong');
  assert.equal(add(l3.link('dex_closed_early', 'override_signed')).kind, 'solved', 'Hale pair, either order');
  assert.equal(l3.link('wipes_scheduled', 'hale_buried').kind, 'wrong', 'level two needs both level-1 results');
  assert.equal(add(l3.link('line9_arrival', 'wipe_signature')).kind, 'solved', 'schedule pair');
  assert.equal(add(l3.link('clean_closes', 'cell_message')).kind, 'solved', 'others pair');
  const last = add(l3.link('hale_buried', 'wipes_scheduled'));
  assert.equal(last.kind, 'solved', 'level two locks'); assert.ok(last.conclusion.effects.some((e) => e.setFlag === 'bureau_deduced'), 'it unlocks the door');
}
