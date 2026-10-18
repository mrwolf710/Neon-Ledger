// Space-age title lettering, drawn from strokes at runtime (no font files): wide, squared letters with cut corners and a soft glow.
// Used for the title screen and the chapter cards; the 3x5 pixel font (pixelfont.ts) stays for everything else.
export const SPACE = { stroke: 0.62, gap: 1.7, space: 3.2, glow: 1.1, core: 0.38, res: 2 }; // stroke, gap, space: in letter units (a letter is 4 wide, 6 tall); glow: blur in units (the wide halo is 2.5x this); core: width of the white-hot centre as a share of the stroke; res: canvas pixels per CSS pixel

type Pts = [number, number][];
const O: Pts = [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]];
const P: Pts = [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]];
const S: Pts = [[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]];
const GLYPHS: Record<string, Pts[]> = {
  A: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]], [[0, 3], [4, 3]]],
  B: [[[0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]], [[0, 0], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [3, 0], [4, 1], [4, 5], [3, 6], [0, 6], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[1, 0], [3, 0]], [[2, 0], [2, 6]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [O],
  P: [P],
  Q: [O, [[2, 4], [4, 6]]],
  R: [P, [[2, 3], [4, 6]]],
  S: [S],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  '0': [O],
  '1': [[[1, 1], [2, 0], [2, 6]], [[1, 6], [3, 6]]],
  '2': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  '3': [[[0, 0], [4, 0], [4, 6], [0, 6]], [[1, 3], [4, 3]]],
  '4': [[[0, 0], [0, 3], [4, 3]], [[4, 0], [4, 6]]],
  '5': [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  '6': [[[4, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [0, 3]]],
  '7': [[[0, 0], [4, 0], [2, 6]]],
  '8': [[[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0]], [[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
  '9': [[[0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [4, 3]]],
  '-': [[[0, 3], [4, 3]]],
  ':': [[[2, 1.4], [2, 2]], [[2, 4], [2, 4.6]]],
  '.': [[[2, 5.4], [2, 6]]],
};

// Returns a canvas for `text`, as tall as the pixel font would be at `scale` (5 px per scale), sized in CSS pixels.
export function spaceText(text: string, color: string | string[], scale: number): HTMLCanvasElement {
  const u = (5 * scale) / 6, S_ = SPACE, str = text.toUpperCase();
  const adv = (ch: string) => (ch === ' ' ? S_.space : 4 + S_.gap);
  const wU = [...str].reduce((w, ch) => w + adv(ch), 0) - S_.gap, pad = S_.glow * 3;
  const cssW = Math.ceil(wU * u + pad * 2 * u), cssH = Math.ceil(6 * u + pad * 2 * u), r = S_.res;
  const cv = Object.assign(document.createElement('canvas'), { width: cssW * r, height: cssH * r });
  const g = cv.getContext('2d')!;
  g.scale(r, r); g.translate(pad * u, pad * u);
  g.lineWidth = S_.stroke * u; g.lineCap = 'square'; g.lineJoin = 'miter';
  // Neon tube: a wide soft halo, a tighter glow, then a thin white-hot core with a coloured fringe, like the booth signs.
  const passes: [number, number, boolean][] = [[2.5, 1, false], [1, 1, false], [0.3, S_.core, true]]; // [blur x glow, width x stroke, white core]
  let n = 0;
  const cols = [...str].map((ch) => (ch === ' ' ? '' : typeof color === 'string' ? color : color[n++ % color.length]));
  for (const [blur, w, core] of passes) {
    g.shadowBlur = S_.glow * blur * u; g.lineWidth = S_.stroke * w * u;
    let x = 0;
    [...str].forEach((ch, k) => {
      g.strokeStyle = core ? '#ffffff' : cols[k]; g.shadowColor = cols[k] || 'transparent';
      for (const path of GLYPHS[ch] ?? []) {
        g.beginPath();
        path.forEach(([px, py], i) => (i ? g.lineTo(x + px * u, py * u) : g.moveTo(x + px * u, py * u)));
        g.stroke();
      }
      x += adv(ch) * u;
    });
  }
  cv.style.cssText = `width:${cssW}px;height:${cssH}px;display:block;margin:-${pad * u}px`; // the glow margin must not push the layout around
  return cv;
}
