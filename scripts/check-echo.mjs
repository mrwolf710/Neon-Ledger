// node scripts/check-echo.mjs — keyframe sampling and data sanity for the echoes in story.js.
import assert from 'node:assert';
import { sample } from '../src/game/echo.js';
import { ECHOES, ENTRIES, SPEAKERS } from '../src/game/story.js';

const track = { keys: [{ t: 0, x: 0, z: 0, anim: 'walk' }, { t: 2, x: 4, z: 0, anim: 'idle' }, { t: 2.01, x: 9, z: 1, facing: 1, anim: 'idle' }] };
assert.equal(sample(track, -1).x, 0); assert.equal(sample(track, 9).x, 9);
assert.equal(sample(track, 1).x, 2); assert.equal(sample(track, 1).anim, 'walk');
assert.ok(Math.abs(sample(track, 1).facing - Math.PI / 2) < 1e-9, 'faces the direction of travel');
assert.equal(sample(track, 2.005).x, 6.5, 'a near-zero gap makes a jump');

for (const [id, e] of Object.entries(ECHOES)) {
  assert.ok(ENTRIES[e.entry]?.kind === 'echoes', `${id}: entry exists`);
  for (const tr of e.tracks) {
    assert.ok(tr.keys.every((k, i, a) => i === 0 || k.t >= a[i - 1].t), `${id}: keys sorted`);
    assert.ok(tr.keys.at(-1).t <= e.duration + 1e-9, `${id}: keys within duration`);
  }
  for (const s of e.seams) assert.ok(s > 0 && s < e.duration, `${id}: seam inside`);
  for (const t of e.tags) assert.ok(ENTRIES[t.fact]?.kind === 'facts', `${id}: tag fact ${t.fact} exists`);
  for (const v of e.voices) assert.ok(SPEAKERS[v.speaker], `${id}: voice speaker ${v.speaker}`);
}
console.log('echo ok');
