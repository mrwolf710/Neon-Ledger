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
assert.equal(l.link('door_unlocked', 'two_voices').kind, 'solved', 'the test pair locks');
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
