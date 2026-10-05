import * as THREE from 'three';
import { PALETTE as P } from '../gen/palette.js';
import { drawText, measure } from '../gen/pixelfont.js';

export const INTERACT = {
  range: 1.6,         // units from the player
  frontDot: 0.2,      // must be roughly in front (cosine) unless closer than closeRange
  closeRange: 0.8,
  pickPixels: 48,     // click this close to an interactable on screen to target it
  promptScale: 3,     // screen pixels per prompt pixel (whole numbers stay crisp)
  promptGap: 0.3,     // units above the interactable's height
  colors: { bubble: P.ink, border: P.cyan, text: P.white, key: P.grey6, keyText: P.ink, xbox: 0x3fae2a, ps: 0x4a7fe0 },
};

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// Draws "[glyph] VERB" in the pixel font for the device: key cap, mouse, Xbox A, PlayStation cross.
// glyph: 'interact' (Space / A / ×) or 'echo' (F / X / □).
function promptCanvas(verb, device, padType, glyph = 'interact') {
  const echo = glyph === 'echo';
  const C = INTERACT.colors, h = 11;
  const label = device === 'keyboard' ? (echo ? 'F' : 'SPC') : '';
  const gw = device === 'keyboard' ? measure(label) + 4 : 7;
  const w = 3 + gw + 3 + measure(verb) + 3;
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h + 2 });
  const ctx = cv.getContext('2d');
  ctx.fillStyle = hex(C.border); ctx.fillRect(0, 0, w, h);                                   // frame
  ctx.fillStyle = hex(C.bubble); ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = hex(C.border); ctx.fillRect((w >> 1) - 1, h, 3, 1); ctx.fillRect(w >> 1, h + 1, 1, 1); // tail
  const gx = 3, gy = 2;
  if (device === 'keyboard') {
    ctx.fillStyle = hex(C.key); ctx.fillRect(gx, gy, gw, 7);
    drawText(ctx, label, gx + 2, gy + 1, hex(C.keyText));
  } else if (device === 'mouse') {
    ctx.fillStyle = hex(C.key); ctx.fillRect(gx + 1, gy, 5, 7); ctx.fillRect(gx, gy + 1, 7, 5);
    ctx.fillStyle = hex(C.border); ctx.fillRect(gx + 1, gy, 2, 3);                           // left button lit
  } else {
    const ps = padType === 'playstation';
    ctx.fillStyle = hex(ps ? C.ps : C.xbox);
    ctx.fillRect(gx + 1, gy, 5, 7); ctx.fillRect(gx, gy + 1, 7, 5);                          // round-ish button
    drawText(ctx, ps ? (echo ? '□' : '×') : (echo ? 'X' : 'A'), gx + 2, gy + 1, hex(C.text));
  }
  drawText(ctx, verb, gx + gw + 3, 3, hex(C.text));
  return cv;
}

// Interactables: { position: Vector3 (live), height, verb, onInteract, id }.
export function createInteractions(scene) {
  const items = [];
  // Drawn as a screen overlay (not in 3D) so bloom and tilt-shift never blur it.
  let canvas = null;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:5;display:none';
  document.body.appendChild(el);
  let shownKey = '', current = null, area = 'street';
  const here = (it) => (it.area ?? 'street') === area;
  const v = new THREE.Vector3();

  return {
    items,
    add(item) { item.height ??= 2; items.push(item); },
    setArea(id) { area = id; },
    get area() { return area; },
    get current() { return current; },
    // Nearest interactable in front of the player (within range).
    nearest(pos, facing) {
      const fx = Math.sin(facing), fz = Math.cos(facing);
      let best = null, bestD = INTERACT.range;
      for (const it of items) {
        if (!here(it)) continue;
        const dx = it.position.x - pos.x, dz = it.position.z - pos.z, d = Math.hypot(dx, dz);
        if (d >= bestD) continue;
        if (d > INTERACT.closeRange && (dx * fx + dz * fz) / d < INTERACT.frontDot) continue;
        best = it; bestD = d;
      }
      return best;
    },
    // Interactable under a screen click, if any.
    pick(click, camera) {
      let best = null, bestD = INTERACT.pickPixels;
      for (const it of items) {
        if (!here(it)) continue;
        v.copy(it.position).setY(it.position.y + it.height / 2).project(camera);
        if (v.z > 1) continue;
        const sx = (v.x + 1) / 2 * window.innerWidth, sy = (1 - v.y) / 2 * window.innerHeight;
        const d = Math.hypot(sx - click.x, sy - click.y);
        if (d < bestD) { best = it; bestD = d; }
      }
      return best;
    },
    hide() { el.style.display = 'none'; current = null; },
    // Shows the prompt over the nearest interactable, with the glyph for the last-used device.
    update(pos, facing, device, padType, camera) {
      current = this.nearest(pos, facing);
      el.style.display = current ? 'block' : 'none';
      if (!current) return;
      const key = `${current.verb}|${current.glyph}|${device}|${padType}`;
      if (key !== shownKey) {
        shownKey = key;
        canvas = promptCanvas(current.verb, device === 'touch' ? 'mouse' : device, padType, current.glyph);
        const k = INTERACT.promptScale;
        canvas.style.cssText = `width:${canvas.width * k}px;height:${canvas.height * k}px;image-rendering:pixelated;display:block`;
        el.replaceChildren(canvas);
      }
      v.copy(current.position).setY(current.position.y + current.height + INTERACT.promptGap).project(camera);
      const sx = Math.round((v.x + 1) / 2 * window.innerWidth - (canvas.width * INTERACT.promptScale) / 2);
      const sy = Math.round((1 - v.y) / 2 * window.innerHeight - canvas.height * INTERACT.promptScale);
      el.style.transform = `translate(${sx}px, ${sy}px)`;
    },
  };
}
