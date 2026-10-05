// node scripts/check-billboard.mjs — a walking billboard keeps a valid sprite-sheet frame (no NaN, stays in range).
import assert from 'node:assert';
const ctx = new Proxy({}, { get: (t, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
  : k === 'measureText' ? () => ({ width: 10 }) : () => ctx), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { getSheets } = await import('../src/gen/sprites.js');
const { createBillboard } = await import('../src/game/npc.js');
const { PLAYER } = await import('../src/game/player.js');

const sheet = getSheets().juno;
const b = createBillboard(sheet, { x: 0, z: 0 });
const mat = b.root.children[0].material;
const steps = [];
b.onStep = (f) => steps.push(f);
b.anim = 'walk';
for (const v of [3, 6]) {
  b.fpsScale = Math.min(PLAYER.runAnim, Math.max(0.6, v / PLAYER.walk));
  steps.length = 0;
  for (let i = 0; i < 120; i++) {
    b.facing = (i / 20) % (Math.PI * 2);
    b.update(1 / 60, 0.8, []);
    const f = mat.uniforms.frame.value;
    assert.ok([f.x, f.y, f.z, f.w].every(Number.isFinite), `frame is finite at speed ${v}, step ${i}`);
    assert.ok(f.x >= 0 && f.x < 1 && f.y >= 0 && f.y < 1, `frame inside the sheet: ${f.x},${f.y}`);
  }
  console.log(`speed ${v}: fpsScale ${b.fpsScale}, ${steps.length} footfalls in 2 s`);
}
console.log('billboard ok');
