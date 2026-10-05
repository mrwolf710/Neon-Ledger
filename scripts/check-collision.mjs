// node scripts/check-collision.mjs — sanity check for the walk grid and wall sliding.
import assert from 'node:assert';
import { createCollision } from '../src/world/collision.js';

const col = createCollision([{ x0: 0, z0: -1, x1: 1, z1: 1 }]); // one crate-sized block
const p = { x: -1, z: 0 };
col.move(p, 0.6, 0, 0.3);
assert.ok(p.x <= -0.3 + 1e-9, `stopped at the block face, got x=${p.x}`);
const q = { x: -1, z: 0 };
col.move(q, 0.6, 0.6, 0.3);
assert.ok(q.z > 0.5 && q.x <= -0.3 + 1e-9, `slid along the face, got ${q.x}, ${q.z}`);
const r = { x: 0, z: 4.5 };
col.move(r, 0, 1, 0.3);
assert.ok(r.z <= 5 - 0.3 + 1e-9, `building line holds, got z=${r.z}`);
const s = { x: -5, z: 0 };
col.move(s, 3, 0, 0.3);
assert.ok(s.x <= -0.3 + 1e-9, `no tunnelling on a long step, got x=${s.x}`);
console.log('collision ok');
