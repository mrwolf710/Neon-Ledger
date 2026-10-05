import * as THREE from 'three';
import { PALETTE as P } from '../gen/palette.js';

export const INTERACT = {
  range: 1.6,         // units from the player
  frontDot: 0.2,      // must be roughly in front (cosine) unless closer than closeRange
  closeRange: 0.8,
  pickPixels: 48,     // click this close to an interactable on screen to target it
  promptPx: 14,       // prompt bubble height in texture pixels (16 px = 1 unit)
  promptGap: 0.3,     // units above the interactable's height
  font: 'bold 9px monospace',
  colors: { bubble: P.ink, border: P.cyan, text: P.white, key: P.grey6, keyText: P.ink, xbox: 0x3fae2a, ps: 0x4a7fe0 },
};

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// Draws "[glyph] Verb" for the device: keyboard key cap, mouse, Xbox A, PlayStation cross.
function promptCanvas(verb, device, padType) {
  const C = INTERACT.colors, h = INTERACT.promptPx;
  const ctx0 = document.createElement('canvas').getContext('2d');
  ctx0.font = INTERACT.font;
  const tw = Math.ceil(ctx0.measureText(verb).width), gw = device === 'keyboard' ? 17 : 10;
  const w = 3 + gw + 3 + tw + 4;
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h + 3 });
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = hex(C.border); ctx.fillRect(0, 0, w, h);                        // border
  ctx.fillStyle = hex(C.bubble); ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = hex(C.border); ctx.fillRect(Math.floor(w / 2) - 1, h, 3, 1); ctx.fillRect(Math.floor(w / 2), h + 1, 1, 1); // tail
  const gx = 3, gy = 2, gh = h - 4;
  ctx.font = 'bold 7px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (device === 'keyboard') {
    ctx.fillStyle = hex(C.key); ctx.fillRect(gx, gy, gw, gh); ctx.fillRect(gx + 1, gy + gh, gw - 2, 1);
    ctx.fillStyle = hex(C.keyText); ctx.fillText('SPC', gx + gw / 2, gy + gh / 2 + 0.5);
  } else if (device === 'mouse') {
    ctx.fillStyle = hex(C.key); ctx.fillRect(gx + 1, gy, gw - 2, gh); ctx.fillRect(gx, gy + 2, gw, gh - 4);
    ctx.fillStyle = hex(C.border); ctx.fillRect(gx + 1, gy, (gw - 2) / 2, gh / 2);    // left button lit
    ctx.fillStyle = hex(C.keyText); ctx.fillRect(gx + gw / 2, gy, 1, gh / 2);
  } else {
    const ps = padType === 'playstation';
    ctx.fillStyle = hex(ps ? C.ps : C.xbox);
    ctx.beginPath(); ctx.arc(gx + gw / 2, gy + gh / 2, gh / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hex(C.text); ctx.fillText(ps ? '×' : 'A', gx + gw / 2, gy + gh / 2 + 0.5);
  }
  ctx.font = INTERACT.font; ctx.textAlign = 'left'; ctx.fillStyle = hex(C.text);
  ctx.fillText(verb, gx + gw + 3, h / 2 + 0.5);
  return cv;
}

// Interactables: { position: Vector3 (live), height, verb, onInteract, id }.
export function createInteractions(scene) {
  const items = [];
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, fog: false }));
  sprite.renderOrder = 10;
  sprite.visible = false;
  scene.add(sprite);
  let shownKey = '', current = null;
  const v = new THREE.Vector3();

  return {
    items,
    add(item) { items.push({ height: 2, ...item }); },
    get current() { return current; },
    // Nearest interactable in front of the player (within range).
    nearest(pos, facing) {
      const fx = Math.sin(facing), fz = Math.cos(facing);
      let best = null, bestD = INTERACT.range;
      for (const it of items) {
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
        v.copy(it.position).setY(it.position.y + it.height / 2).project(camera);
        if (v.z > 1) continue;
        const sx = (v.x + 1) / 2 * window.innerWidth, sy = (1 - v.y) / 2 * window.innerHeight;
        const d = Math.hypot(sx - click.x, sy - click.y);
        if (d < bestD) { best = it; bestD = d; }
      }
      return best;
    },
    // Shows the prompt over the nearest interactable, with the glyph for the last-used device.
    update(pos, facing, device, padType) {
      current = this.nearest(pos, facing);
      sprite.visible = !!current;
      if (!current) return;
      const key = `${current.verb}|${device}|${padType}`;
      if (key !== shownKey) {
        shownKey = key;
        const cv = promptCanvas(current.verb, device === 'touch' ? 'mouse' : device, padType);
        sprite.material.map?.dispose();
        const t = new THREE.CanvasTexture(cv);
        t.magFilter = t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.colorSpace = THREE.SRGBColorSpace;
        sprite.material.map = t;
        sprite.material.needsUpdate = true;
        sprite.scale.set(cv.width / 16, cv.height / 16, 1);
        sprite.center.set(0.5, 0);
      }
      sprite.position.copy(current.position).setY(current.position.y + current.height + INTERACT.promptGap);
    },
  };
}
