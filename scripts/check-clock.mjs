// node scripts/check-clock.mjs — phases and formatting of the game clock.
import assert from 'node:assert';
import { createClock } from '../src/game/clock.js';

const c = createClock();
assert.equal(c.text, '00:35'); assert.equal(c.phase.id, 'night');
c.setTime(23, 0); assert.equal(c.phase.id, 'night');
c.setTime(1, 29); assert.equal(c.text, '01:29'); assert.equal(c.phase.id, 'night');
c.setTime(1, 30); assert.equal(c.phase.id, 'deadHour');
c.setTime(2, 10); assert.equal(c.text, '02:10');
c.update(60); assert.equal(c.text, '03:10');
c.setTime(22, 0); assert.equal(c.progress, 0);
c.setTime(5, 0); assert.equal(c.progress, 1);
c.paused = true; const m = c.minutes; c.update(10); assert.equal(c.minutes, m);
console.log('clock ok');
