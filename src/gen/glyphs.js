import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

// Invented sign script: pseudo-kanji built from 3-7 strokes on a 12 px grid, one glyph per world unit.
export const GLYPHS = {
  cell: 16,              // px per glyph (= 1 world unit)
  pad: 2,                // px border inside each cell
  stops: [0, 3, 6, 9, 11], // stroke endpoints inside the 12 px glyph box
  strokes: [3, 7],
  background: P.night,
  border: true,
};

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function twoStops(rng) {
  const S = GLYPHS.stops;
  let a = rng.int(0, S.length - 1), b = rng.int(0, S.length - 1);
  if (a === b) b = a < S.length - 1 ? a + 1 : a - 1;
  return [S[Math.min(a, b)], S[Math.max(a, b)]];
}

// Draws one glyph with its top-left at (ox, oy).
function drawGlyph(ctx, rng, ox, oy) {
  const S = GLYPHS.stops, n = rng.int(...GLYPHS.strokes);
  const line = (x, y, w, h) => ctx.fillRect(ox + x, oy + y, w, h);
  for (let i = 0; i < n; i++) {
    const kind = rng.pick(['h', 'h', 'v', 'v', 'hook', 'box']);
    const [a, b] = twoStops(rng), p = rng.pick(S);
    if (kind === 'h') line(a, p, b - a + 1, 1);
    else if (kind === 'v') line(p, a, 1, b - a + 1);
    else if (kind === 'hook') {
      line(p, a, 1, b - a + 1);
      const dir = p > 5 ? -1 : 1;
      line(dir > 0 ? p : p - 2, b, 3, 1);
    } else {
      const [c, d] = twoStops(rng);
      line(a, c, b - a + 1, 1); line(a, d, b - a + 1, 1);
      line(a, c, 1, d - c + 1); line(b, c, 1, d - c + 1);
    }
  }
}

// Texture for a sign of `count` glyphs, vertical (1 x count units) or horizontal (count x 1).
export function signTexture(rng, count, vertical, color) {
  const G = GLYPHS;
  const w = vertical ? G.cell : G.cell * count, h = vertical ? G.cell * count : G.cell;
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex(G.background);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = hex(color);
  if (G.border) {
    ctx.fillRect(0, 0, w, 1); ctx.fillRect(0, h - 1, w, 1);
    ctx.fillRect(0, 0, 1, h); ctx.fillRect(w - 1, 0, 1, h);
  }
  for (let i = 0; i < count; i++) {
    drawGlyph(ctx, rng, (vertical ? 0 : i * G.cell) + G.pad, (vertical ? i * G.cell : 0) + G.pad);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
