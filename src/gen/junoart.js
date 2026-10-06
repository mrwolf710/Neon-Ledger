import * as THREE from 'three';

// Juno's sprites are the owner's own pixel art (48x48, 8 directions), loaded from public/sprites/juno/<state>/<direction>.png.
// Each state is one key pose per direction, so the animations are assembled from those poses:
//   walk   = arm-swing pose (down), the same pose 1 px up, the opposite-side pose (mirrored, down), and 1 px up: no standing frames, so the stride never stops
//   sneak  = crouched pose, a 1 px dip, the opposite-side pose (mirrored), a 1 px dip
//   tablet = tablet pose, then the opposite-side pose (mirrored) so the hands seem to tap
//   idle   = standing pose, then the same pose 1 px lower (breathing)
export const JUNO_ART = {
  base: 'sprites/juno',
  size: 48,                  // frame size in px
  pxPerUnit: 22,             // her figure is ~40 px tall, so ~1.8 world units like the other characters
  dirs: ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'], // clockwise as seen on screen, 0 = facing the camera
};
// Mama Teo: the owner's "slow breathing idle" (one pose per direction); the breath is the pose dipping 1 px.
export const TEO_ART = { base: 'sprites/teo', size: 48, pxPerUnit: 24, dirs: JUNO_ART.dirs, states: [''] }; // pxPerUnit: her figure is ~38 px tall and stout
const TEO_FRAMES = { idle: [['', false, 0], ['', false, 1]] };
// Holo-preacher: one 144x144 PNG, a 3x3 grid of 48 px cells in reading order = the 8 directions (the 9th cell is empty). Drawn as a cyan hologram by the CAST ghost flag.
export const PRIEST_ART = { base: 'sprites/priest', size: 48, pxPerUnit: 25, dirs: JUNO_ART.dirs, states: [''] };
// Dex (dead, seated in the Sable's back room): 8 still poses, one frame only so he never moves.
export const DEX_ART = { base: 'sprites/corpo', size: 48, pxPerUnit: 24, dirs: JUNO_ART.dirs, states: [''] };
const DEX_FRAMES = { idle: [['', false, 0]] };
// Animated idles (the owner's Pixellab exports): one south-facing loop of 8 frames (idle-0..7.png) plus a still per direction.
// Other directions hold their still, so the loop only shows when the character faces the camera.
export const CAT_ART = { base: 'sprites/cat', size: 48, pxPerUnit: 55, fps: 8, small: true, walk: 'walk', walkFps: 10, dirs: JUNO_ART.dirs }; // Miso: figure ~46 px tall facing the camera, so ~0.8 units
export const DEX_STAND_ART = { base: 'sprites/corpo-stand', size: 48, pxPerUnit: 24, fps: 6, dirs: JUNO_ART.dirs }; // Dex standing, for his echo scenes
// Kit (hostel): the owner's worker, one Pixellab sheet of 68 px cells: row 0 = 8 stills, rows 1-8 = the 8-frame idle loop per direction.
export const KIT_ART = { base: 'sprites/kit', cell: 68, pxPerUnit: 24, fps: 6, foot: 11, dirs: JUNO_ART.dirs }; // foot = empty pixels under the shoes in each cell
const LOOP = 8;
const OPP = { south: 'south', north: 'north', east: 'west', west: 'east', 'south-east': 'south-west', 'south-west': 'south-east', 'north-east': 'north-west', 'north-west': 'north-east' };

// Frame recipes: [state, mirrored?, dy] where mirrored uses the opposite direction's picture flipped.
const FRAMES = {
  idle: [['idle', false, 0], ['idle', false, 1]],
  walk: [['walk', false, 1], ['walk', false, 0], ['walk', true, 1], ['walk', true, 0]],
  sneak: [['sneak', false, 0], ['sneak', false, 1], ['sneak', true, 0], ['sneak', true, 1]],
  tablet: [['tablet', false, 0], ['tablet', true, 0]],
};

const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`could not load ${url}`)); i.src = url; });

// Returns a sheet in the same shape the billboard expects, with 8 directions per animation (sheet.dirs = 8).
export const loadJunoSheet = () => loadSheet(JUNO_ART, FRAMES, ['idle', 'walk', 'sneak', 'tablet']);
export async function loadPriestSheet() {
  const S = PRIEST_ART.size, grid = await load(`${import.meta.env.BASE_URL}${PRIEST_ART.base}/sheet.png`), imgs = {};
  PRIEST_ART.dirs.forEach((d, i) => {
    const c = Object.assign(document.createElement('canvas'), { width: S, height: S });
    c.getContext('2d').drawImage(grid, (i % 3) * S, Math.floor(i / 3) * S, S, S, 0, 0, S, S);
    imgs[`/${d}`] = c;
  });
  return loadSheet(PRIEST_ART, TEO_FRAMES, [''], imgs);
}
export const loadDexSheet = () => loadSheet(DEX_ART, DEX_FRAMES, ['']);
export const loadTeoSheet = () => loadSheet(TEO_ART, TEO_FRAMES, ['']);
export async function loadKitSheet() {
  const A = KIT_ART, img = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`);
  const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
  canvas.getContext('2d').drawImage(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const animRows = { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i + 1])) };
  return { texture, canvas, frameW: A.cell, frameH: A.cell, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims: { idle: { start: 0, frames: LOOP } }, fps: A.fps, footPx: A.foot };
}
export const loadCatSheet = () => loadLoopSheet(CAT_ART);
export const loadDexStandSheet = () => loadLoopSheet(DEX_STAND_ART);

async function loadLoopSheet(A) {
  const S = A.size, url = (n) => `${import.meta.env.BASE_URL}${A.base}/${n}.png`;
  const stills = await Promise.all(A.dirs.map((d) => load(url(d))));
  const loop = await Promise.all(Array.from({ length: LOOP }, (_, i) => load(url(`idle-${i}`))));
  const canvas = Object.assign(document.createElement('canvas'), { width: S * LOOP, height: S * A.dirs.length * (A.walk ? 2 : 1) });
  const ctx = canvas.getContext('2d');
  // the loop frames are 80 px, the stills 48: crop the middle of each
  A.dirs.forEach((d, row) => { for (let f = 0; f < LOOP; f++) { const im = d === 'south' ? loop[f] : stills[row]; ctx.drawImage(im, (im.width - S) / 2, (im.height - S) / 2, S, S, f * S, row * S, S, S); } });
  const animRows = { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i])) }, anims = { idle: { start: 0, frames: LOOP } };
  if (A.walk) { // Pixellab sheet of 80 px cells: row 0 stills, rows 1-8 the 8-frame walk per direction; crop each to the middle 48 px
    const w = await load(`${import.meta.env.BASE_URL}${A.base}/${A.walk}.png`), cell = w.width / LOOP, o = (cell - S) / 2;
    A.dirs.forEach((d, i) => { for (let f = 0; f < LOOP; f++) ctx.drawImage(w, f * cell + o, (i + 1) * cell + o, S, S, f * S, (A.dirs.length + i) * S, S, S); });
    animRows.walk = Object.fromEntries(A.dirs.map((d, i) => [d, A.dirs.length + i])); anims.walk = { start: 0, frames: LOOP };
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims, fps: A.fps, walkFps: A.walkFps, small: !!A.small };
}

async function loadSheet(A, FRAMES, states, preloaded) {
  const S = A.size;
  const imgs = preloaded || {};
  if (!preloaded) await Promise.all(states.flatMap((st) => A.dirs.map(async (d) => { imgs[`${st}/${d}`] = await load(`${import.meta.env.BASE_URL}${A.base}/${st ? st + '/' : ''}${d}.png`); })));

  const anims = Object.keys(FRAMES), cols = 4;
  const canvas = Object.assign(document.createElement('canvas'), { width: S * cols, height: S * A.dirs.length * anims.length });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const animRows = {}, sheetAnims = {};
  anims.forEach((anim, ai) => {
    animRows[anim] = {}; sheetAnims[anim] = { start: 0, frames: FRAMES[anim].length };
    A.dirs.forEach((dir, di) => {
      const row = ai * A.dirs.length + di;
      animRows[anim][dir] = row;
      FRAMES[anim].forEach(([state, mirrored, dy], f) => {
        const x = f * S, y = row * S + dy;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, row * S, S, S); ctx.clip();
        if (!mirrored) ctx.drawImage(imgs[`${state}/${dir}`], x, y);
        else { ctx.translate(x + S, y); ctx.scale(-1, 1); ctx.drawImage(imgs[`${state}/${OPP[dir]}`], 0, 0); }
        ctx.restore();
      });
    });
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims: sheetAnims };
}
