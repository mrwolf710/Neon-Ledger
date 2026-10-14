import * as THREE from 'three';

// Juno's sprites are the owner's own pixel art (48x48, 8 directions), loaded from public/sprites/juno/<state>/<direction>.png.
// Each state is one key pose per direction, so the animations are assembled from those poses:
//   walk   = arm-swing pose (down), the same pose 1 px up, then the same upper body with the LEGS from the opposite-side pose (mirrored), down and up: no standing frames, so the stride never stops.
//            Only the legs are mirrored: mirroring the whole figure flipped her armband and hair side every step (flicker).
//   sneak  = the same, crouched
//   run, walk = the owner's Pixellab sheets (sprites/juno/run/sheet.png 4 frames, walk/sheet.png 6 frames: 80 px cells, rows 1-8 = one direction each), cropped to 48 px. Both optional: a missing walk sheet falls back to the pose-built walk above, a missing run sheet to walking.
//   listening = standing still, taking a call (Hale on the platform): the pose, then 1 px lower
//   tablet = tablet pose, then the opposite-side pose (mirrored) so the hands seem to tap
//   idle   = standing pose, then the same pose 1 px lower (breathing)
export const JUNO_ART = {
  base: 'sprites/juno',
  size: 48,                  // frame size in px
  sheets: { run: { file: 'run/sheet', frames: 4 }, walk: { file: 'walk/sheet', frames: 6 } }, sheetCell: 80, walkFps: 8, // Pixellab animation sheets under base, and their cell size
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
// files: this set's diagonal pictures are named with north/south swapped (south-east.png shows his back), so each diagonal reads the other's file.
export const DEX_STAND_ART = { base: 'sprites/corpo-stand', size: 48, pxPerUnit: 24, fps: 6, dirs: JUNO_ART.dirs,
  files: { 'south-east': 'north-east', 'north-east': 'south-east', 'south-west': 'north-west', 'north-west': 'south-west' } }; // Dex standing, for his echo scenes
// Kit (hostel): the owner's worker, one Pixellab sheet of 68 px cells: row 0 = 8 stills, rows 1-8 = the 8-frame idle loop per direction.
export const KIT_ART = { base: 'sprites/kit', cell: 68, pxPerUnit: 24, fps: 6, foot: 11, dirs: JUNO_ART.dirs }; // foot = empty pixels under the shoes in each cell
// The street vendor: same kind of sheet, 64 px cells, a 4-frame breathing loop.
export const VENDOR_ART = { base: 'sprites/vendor', cell: 64, pxPerUnit: 24, fps: 4, foot: 10, frames: 4, dirs: JUNO_ART.dirs };
// Echo Exchange vendors drawn by the owner (public/sprites/<name>/sheet.png, same layout as the vendor: 64 px cells, row 0 = 8 stills, rows 1-8 = a 4-frame breathing loop). market1 = Tobbo, the cable seller.
export const MARKET1_ART = { base: 'sprites/market1', cell: 64, pxPerUnit: 24, fps: 4, foot: 11, frames: 4, dirs: JUNO_ART.dirs };
// Hale: eight 48 px rotation frames across one row; comms show the rear-left (north-west) view.
export const HALE_ART = { base: 'sprites/hale', size: 48, pxPerUnit: 24, dirs: JUNO_ART.dirs, portraitDirection: 'north-west' };
// Street walkers (CAST walkerA, walkerB): one Pixellab sheet each: row 0 = 8 stills (idle), rows 1-8 = the walk per direction (`frames` long). `cell` px cells, cropped to the middle 48 px.
export const WALKER1_ART = { base: 'sprites/walker1', size: 48, cell: 80, frames: 8, pxPerUnit: 24, walkFps: 7, dirs: JUNO_ART.dirs }; // the "sad walk"
export const WALKER2_ART = { base: 'sprites/walker2', size: 48, cell: 64, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the businessman
export const WALKER3_ART = { base: 'sprites/walker3', size: 48, cell: 80, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the woman in the red dress
export const WALKER4_ART = { base: 'sprites/walker4', size: 48, cell: 80, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the cyberpunk lady
const LEGS_Y = 38; // px row where the legs start (below the coat hem): walk/sneak frames swap only the part below it
const FOOT_LIFT = 3; // px a stepping foot is raised (the left / right half of the legs alternate), so the feet visibly move
const LOOP = 8;
const OPP = { south: 'south', north: 'north', east: 'west', west: 'east', 'south-east': 'south-west', 'south-west': 'south-east', 'north-east': 'north-west', 'north-west': 'north-east' };

// Frame recipes: [state, mirrored?, dy] where mirrored uses the opposite direction's picture flipped.
const FRAMES = {
  idle: [['idle', false, 0], ['idle', false, 1]],
  walk: [['walk', false, 1, [FOOT_LIFT, 0]], ['walk', false, 0], ['walk', 'legs', 1, [0, FOOT_LIFT]], ['walk', 'legs', 0]],
  sneak: [['sneak', false, 0, [1, 0]], ['sneak', false, 1], ['sneak', 'legs', 0, [0, 1]], ['sneak', 'legs', 1]],
  tablet: [['tablet', false, 0], ['tablet', true, 0]],
  listening: [['listening', false, 0], ['listening', false, 1]],
};

const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`could not load ${url}`)); i.src = url; });

// Returns a sheet in the same shape the billboard expects, with 8 directions per animation (sheet.dirs = 8).
export const loadJunoSheet = () => loadSheet(JUNO_ART, FRAMES, ['idle', 'walk', 'sneak', 'tablet', 'listening']);
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
export const loadVendorSheet = () => loadKitSheet(VENDOR_ART);
// The three Bureau auditors (chapter 2 ending): eight 48 px stills (<dir>.png) and a 4-frame breathing loop (64 px frames, idle-<dir>-<n>.png) for south, north and south-east; other directions hold their still.
export const AUDITOR_ART = { base: 'sprites/auditors', size: 48, pxPerUnit: 24, fps: 4, frames: 4, loops: ['south', 'north', 'south-east'], dirs: JUNO_ART.dirs };
export async function loadAuditorSheet(A = AUDITOR_ART) {
  const S = A.size, url = (n) => `${import.meta.env.BASE_URL}${A.base}/${n}.png`, N = A.frames;
  const stills = await Promise.all(A.dirs.map((d) => load(url(d))));
  const loops = Object.fromEntries(await Promise.all(A.loops.map(async (d) => [d, await Promise.all(Array.from({ length: N }, (_, i) => load(url(`idle-${d}-${i}`))))])));
  const canvas = Object.assign(document.createElement('canvas'), { width: S * N, height: S * A.dirs.length });
  const ctx = canvas.getContext('2d');
  A.dirs.forEach((d, row) => { for (let f = 0; f < N; f++) { const im = loops[d]?.[f] ?? stills[row]; ctx.drawImage(im, (im.width - S) / 2, (im.height - S) / 2, S, S, f * S, row * S, S, S); } });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows: { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i])) }, anims: { idle: { start: 0, frames: N } }, fps: A.fps };
}
export async function loadHaleSheet() {
  const A = HALE_ART, grid = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`), imgs = {};
  A.dirs.forEach((dir, i) => {
    const canvas = Object.assign(document.createElement('canvas'), { width: A.size, height: A.size });
    canvas.getContext('2d').drawImage(grid, i * A.size, 0, A.size, A.size, 0, 0, A.size, A.size);
    imgs[`/${dir}`] = canvas;
  });
  return { ...await loadSheet(A, DEX_FRAMES, [''], imgs), portraitDirection: A.portraitDirection };
}
export async function loadKitSheet(A = KIT_ART) {
  const img = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`);
  const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
  canvas.getContext('2d').drawImage(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const animRows = { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i + 1])) };
  return { texture, canvas, frameW: A.cell, frameH: A.cell, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims: { idle: { start: 0, frames: A.frames ?? LOOP } }, fps: A.fps, footPx: A.foot };
}
export async function loadWalkerSheet(A = WALKER1_ART) {
  const S = A.size, n = A.dirs.length, N = A.frames, img = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`), o = (A.cell - S) / 2;
  const canvas = Object.assign(document.createElement('canvas'), { width: S * N, height: S * n * 2 });
  const ctx = canvas.getContext('2d');
  A.dirs.forEach((d, i) => {
    ctx.drawImage(img, i * A.cell + o, o, S, S, 0, i * S, S, S);                                              // idle: the still
    for (let f = 0; f < N; f++) ctx.drawImage(img, f * A.cell + o, (i + 1) * A.cell + o, S, S, f * S, (n + i) * S, S, S); // walk
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const rows = (base) => Object.fromEntries(A.dirs.map((d, i) => [d, base + i]));
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows: { idle: rows(0), walk: rows(n) },
    anims: { idle: { start: 0, frames: 1 }, walk: { start: 0, frames: N } }, fps: 2, walkFps: A.walkFps };
}
export const loadCatSheet = () => loadLoopSheet(CAT_ART);
export const loadDexStandSheet = () => loadLoopSheet(DEX_STAND_ART);

async function loadLoopSheet(A) {
  const S = A.size, url = (n) => `${import.meta.env.BASE_URL}${A.base}/${n}.png`;
  const stills = await Promise.all(A.dirs.map((d) => load(url(A.files?.[d] ?? d))));
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

  const extra = []; // owner animation sheets that loaded: { name, img, frames }
  for (const [name, x] of Object.entries(A.sheets ?? {})) {
    const img = await load(`${import.meta.env.BASE_URL}${A.base}/${x.file}.png`).catch(() => null);
    if (img) extra.push({ name, img, frames: x.frames });
  }
  const anims = Object.keys(FRAMES).filter((a) => !extra.some((e) => e.name === a)), cols = Math.max(4, ...extra.map((e) => e.frames));
  const canvas = Object.assign(document.createElement('canvas'), { width: S * cols, height: S * A.dirs.length * (anims.length + extra.length) });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const animRows = {}, sheetAnims = {};
  anims.forEach((anim, ai) => {
    animRows[anim] = {}; sheetAnims[anim] = { start: 0, frames: FRAMES[anim].length };
    A.dirs.forEach((dir, di) => {
      const row = ai * A.dirs.length + di;
      animRows[anim][dir] = row;
      FRAMES[anim].forEach(([state, mirrored, dy, lift], f) => {
        const x = f * S, y = row * S + dy;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, row * S, S, S); ctx.clip();
        if (!mirrored && !lift) ctx.drawImage(imgs[`${state}/${dir}`], x, y);
        else if (mirrored === 'legs' || lift) { // legs: the left and right half are drawn separately (one foot raised), then the upper body on top
          const flip = mirrored === 'legs', legs = imgs[`${state}/${flip ? OPP[dir] : dir}`];
          [0, 1].forEach((half) => {
            ctx.save(); ctx.beginPath(); ctx.rect(x + (half * S) / 2, row * S, S / 2, S); ctx.clip();
            const up = lift?.[half] ?? 0;
            if (flip) { ctx.translate(x + S, y); ctx.scale(-1, 1); ctx.drawImage(legs, 0, LEGS_Y, S, S - LEGS_Y, 0, LEGS_Y - up, S, S - LEGS_Y); } else ctx.drawImage(legs, 0, LEGS_Y, S, S - LEGS_Y, x, y + LEGS_Y - up, S, S - LEGS_Y);
            ctx.restore();
          });
          ctx.drawImage(imgs[`${state}/${dir}`], 0, 0, S, LEGS_Y, x, y, S, LEGS_Y);
        } else { ctx.translate(x + S, y); ctx.scale(-1, 1); ctx.drawImage(imgs[`${state}/${OPP[dir]}`], 0, 0); }
        ctx.restore();
      });
    });
  });
  extra.forEach(({ name, img, frames }, ei) => {
    const cell = A.sheetCell, o = (cell - S) / 2;
    animRows[name] = {}; sheetAnims[name] = { start: 0, frames };
    A.dirs.forEach((dir, di) => {
      const row = (anims.length + ei) * A.dirs.length + di;
      animRows[name][dir] = row;
      for (let f = 0; f < frames; f++) ctx.drawImage(img, f * cell + o, (di + 1) * cell + o, S, S, f * S, row * S, S, S);
    });
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims: sheetAnims, walkFps: A.walkFps };
}
