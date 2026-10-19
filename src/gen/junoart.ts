import * as THREE from 'three';
import type { SpriteSheet, SheetAnim } from './sprites.ts';

// Shapes of the *_ART tables below, by the loader that consumes them.
export interface SheetArt { base: string; pxPerUnit: number; dirs: string[]; size: number; sheets?: Record<string, { file: string; frames: number }>; sheetCell?: number; walkFps?: number }
export interface KitArt { base: string; cell: number; pxPerUnit: number; fps: number; foot: number; frames?: number; dirs: string[] }
export interface WalkerArt { base: string; size: number; cell: number; frames: number; pxPerUnit: number; walkFps: number; dirs: string[] }
export interface LoopArt { base: string; size: number; pxPerUnit: number; fps?: number; small?: boolean; walk?: string; walkFps?: number; dirs: string[]; files?: Record<string, string> }
// [state, mirrored (true = whole figure, 'legs' = legs only), dy, lift per leg half]
type FrameRecipe = [string, boolean | string, number, number[]?];
type FrameTable = Record<string, FrameRecipe[]>;
type Anims = Record<string, SheetAnim>;
type AnimRows = Record<string, Record<string, number>>;

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
const TEO_FRAMES: FrameTable = { idle: [['', false, 0], ['', false, 1]] };
// Holo-preacher: one 144x144 PNG, a 3x3 grid of 48 px cells in reading order = the 8 directions (the 9th cell is empty). Drawn as a cyan hologram by the CAST ghost flag.
export const PRIEST_ART = { base: 'sprites/priest', size: 48, pxPerUnit: 25, dirs: JUNO_ART.dirs, states: [''] };
// Dex (dead, seated in the Sable's back room): 8 still poses, one frame only so he never moves.
export const DEX_ART = { base: 'sprites/corpo', size: 48, pxPerUnit: 24, dirs: JUNO_ART.dirs, states: [''] };
const DEX_FRAMES: FrameTable = { idle: [['', false, 0]] };
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
export const MARKET7_ART = { ...MARKET1_ART, base: 'sprites/market7', cell: 68, fps: 8, frames: 8, foot: 11 }; // market7 = Pim, the umbrella seller (short, red tee, stovepipe hat): 68 px cells, 8-frame idle, feet 11 px above the cell bottom
// The arcade kid (public/sprites/arcade1/sheet.png): 80 px cells, row 0 = 8 stills, rows 1-8 = a 6-frame 'pull the lever' loop per direction. pxPerUnit 32 makes him a child next to the 24 px/unit adults.
export const ARCADE1_ART = { ...MARKET1_ART, base: 'sprites/arcade1', cell: 80, pxPerUnit: 32, fps: 6, frames: 6, foot: 15 };
export const MARKET9_ART = { ...MARKET1_ART, base: 'sprites/market9', cell: 48, fps: 4, frames: 1, foot: 1 }; // market9 = Jinx, the stim-drink seller (smiling silver humanoid robot): a stills-only sheet, 8 x 48 px in a row (composed from Assets/Market9 rotations)
export const ARCADE2_ART = { ...ARCADE1_ART, base: 'sprites/arcade2' }; // the second arcade kid, same sheet layout as arcade1
export const ARCADE3_ART = { ...ARCADE1_ART, base: 'sprites/arcade3' }; // the third arcade kid (a teenager in purple and green), same layout
export const MARKET10_ART = { ...MARKET9_ART, base: 'sprites/market10', foot: 2 }; // market10 = Vesper, the echo broker (male, orange spiky hair): stills-only 8 x 48 px
export const MARKET8_ART = { ...MARKET7_ART, base: 'sprites/market8' }; // market8 = Bolt, the drone seller (white tee, black jacket, red trousers, long black hair, cane): 68 px cells, 8-frame idle
export const MARKET6_ART = { ...MARKET1_ART, base: 'sprites/market6', cell: 80, foot: 16 }; // market6 = Oyo, the noodle seller (potbelly, dirty tee, flip-flops): 80 px cells, feet 16 px above the cell bottom
export const MARKET5_ART = { ...MARKET1_ART, base: 'sprites/market5', foot: 10 }; // market5 = Ruth, the jewellery seller (gray long hair, glasses, red tee); her feet sit 10 px above the cell bottom
export const DEALER_ART = { ...MARKET1_ART, base: 'sprites/dealer', cell: 68, fps: 8, frames: 8, foot: 11 }; // the implant dealer: 68 px cells, 8-frame idle, feet 11 px above the cell bottom (portrait still to come)
export const MARKET4_ART = { ...MARKET1_ART, base: 'sprites/market4', cell: 68, fps: 8, frames: 8 }; // market4 = Slate, the ID printer (tattooed, eyepiece): 68 px cells, 8-frame idle
export const MARKET3_ART = { ...MARKET1_ART, base: 'sprites/market3' }; // market3 = Gutter, the parts seller (tank top, cybernetic arm)
// Hale: eight 48 px rotation frames across one row; comms show the rear-left (north-west) view.
export const HALE_ART = { base: 'sprites/hale', size: 48, pxPerUnit: 24, sheets: { walk: { file: 'walk/sheet', frames: 6 } }, sheetCell: 80, walkFps: 8, dirs: JUNO_ART.dirs, portraitDirection: 'north-west' };
// Street walkers (CAST walkerA, walkerB): one Pixellab sheet each: row 0 = 8 stills (idle), rows 1-8 = the walk per direction (`frames` long). `cell` px cells, cropped to the middle 48 px.
export const WALKER1_ART = { base: 'sprites/walker1', size: 48, cell: 80, frames: 8, pxPerUnit: 24, walkFps: 7, dirs: JUNO_ART.dirs }; // the "sad walk"
export const WALKER2_ART = { base: 'sprites/walker2', size: 48, cell: 64, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the businessman
export const WALKER3_ART = { base: 'sprites/walker3', size: 48, cell: 80, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the woman in the red dress
export const WALKER4_ART = { base: 'sprites/walker4', size: 48, cell: 80, frames: 6, pxPerUnit: 24, walkFps: 8, dirs: JUNO_ART.dirs }; // the cyberpunk lady
const LEGS_Y = 38; // px row where the legs start (below the coat hem): walk/sneak frames swap only the part below it
const FOOT_LIFT = 3; // px a stepping foot is raised (the left / right half of the legs alternate), so the feet visibly move
const LOOP = 8;
const OPP: Record<string, string> = { south: 'south', north: 'north', east: 'west', west: 'east', 'south-east': 'south-west', 'south-west': 'south-east', 'north-east': 'north-west', 'north-west': 'north-east' };

// Frame recipes: [state, mirrored?, dy] where mirrored uses the opposite direction's picture flipped.
const FRAMES: FrameTable = {
  idle: [['idle', false, 0], ['idle', false, 1]],
  walk: [['walk', false, 1, [FOOT_LIFT, 0]], ['walk', false, 0], ['walk', 'legs', 1, [0, FOOT_LIFT]], ['walk', 'legs', 0]],
  sneak: [['sneak', false, 0, [1, 0]], ['sneak', false, 1], ['sneak', 'legs', 0, [0, 1]], ['sneak', 'legs', 1]],
  tablet: [['tablet', false, 0], ['tablet', true, 0]],
  listening: [['listening', false, 0], ['listening', false, 1]],
  sit: [['sit', false, 0], ['sit', false, 1]],
};

const load = (url: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`could not load ${url}`)); i.src = url; });

// Returns a sheet in the same shape the billboard expects, with 8 directions per animation (sheet.dirs = 8).
export const loadJunoSheet = () => loadSheet(JUNO_ART, FRAMES, ['idle', 'walk', 'sneak', 'tablet', 'listening', 'sit']);
export async function loadPriestSheet(): Promise<SpriteSheet> {
  const S = PRIEST_ART.size, grid = await load(`${import.meta.env.BASE_URL}${PRIEST_ART.base}/sheet.png`), imgs: Record<string, CanvasImageSource> = {};
  PRIEST_ART.dirs.forEach((d, i) => {
    const c = Object.assign(document.createElement('canvas'), { width: S, height: S });
    c.getContext('2d')!.drawImage(grid, (i % 3) * S, Math.floor(i / 3) * S, S, S, 0, 0, S, S);
    imgs[`/${d}`] = c;
  });
  return loadSheet(PRIEST_ART, TEO_FRAMES, [''], imgs);
}
// Dex's dead body (the owner's stills) gets a wound painted on at load: blood pooled at the back of his head, seen from every direction that shows the back of it.
// Masks: R = blood, D = dark clot, r = wet highlight, . = nothing; drawn only over opaque pixels. at = [x, y] of the mask's top-left in the 48 px frame.
export const DEX_BLOOD = {
  colors: { R: '#a3121a', D: '#5c0a0f', r: '#d02a32' } as Record<string, string>,
  big: ['..DDRD...', '.DRRrRD..', 'DRRRDRRD.', 'DRrRDRRRD', '.DRRRRRD.', '..DRRRD..', '...DRD...', '....R....', '....D....'],
  side: ['.DRD', 'DRRD', 'DRrR', 'DRRD', '.DRD', '..R.'],
  at: { 'north': ['big', 20, 3], 'north-west': ['big', 21, 4], 'north-east': ['big', 19, 4], 'east': ['side', 17, 4], 'west': ['side', 27, 4] } as Record<string, ['big' | 'side', number, number]>,
};
export async function loadDexSheet(): Promise<SpriteSheet> {
  const A = DEX_ART, imgs: Record<string, CanvasImageSource> = {};
  await Promise.all(A.dirs.map(async (d) => {
    const img = await load(`${import.meta.env.BASE_URL}${A.base}/${d}.png`);
    const cv = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }), ctx = cv.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const spot = DEX_BLOOD.at[d];
    if (spot) {
      const [mask, x0, y0] = spot, rows = DEX_BLOOD[mask], data = ctx.getImageData(0, 0, cv.width, cv.height);
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        const col = DEX_BLOOD.colors[ch], x = x0 + dx, y = y0 + dy, i = (y * cv.width + x) * 4;
        if (!col || data.data[i + 3] < 20) return; // only on the body, never in the empty space around it
        data.data[i] = parseInt(col.slice(1, 3), 16); data.data[i + 1] = parseInt(col.slice(3, 5), 16); data.data[i + 2] = parseInt(col.slice(5, 7), 16);
      }));
      ctx.putImageData(data, 0, 0);
    }
    imgs[`/${d}`] = cv;
  }));
  return loadSheet(A, DEX_FRAMES, [''], imgs);
}
export const loadTeoSheet = () => loadSheet(TEO_ART, TEO_FRAMES, ['']);
export const loadVendorSheet = () => loadKitSheet(VENDOR_ART);
// The three Bureau auditors (chapter 2 ending): eight 48 px stills (<dir>.png) and a 4-frame breathing loop (64 px frames, idle-<dir>-<n>.png) for south, north and south-east; other directions hold their still.
export const AUDITOR_ART = { ...MARKET1_ART, base: 'sprites/auditors', pxPerUnit: 20, foot: 11, walk: { file: 'walk/sheet', walkFps: 8, cell: 68 } }; // the three Bureau auditors share one owner sheet (64 px cells, 8 directions, 4-frame idle) and portrait
export async function loadHaleSheet(): Promise<SpriteSheet> {
  const A = HALE_ART, grid = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`), imgs: Record<string, CanvasImageSource> = {};
  A.dirs.forEach((dir, i) => {
    const canvas = Object.assign(document.createElement('canvas'), { width: A.size, height: A.size });
    canvas.getContext('2d')!.drawImage(grid, i * A.size, 0, A.size, A.size, 0, 0, A.size, A.size);
    imgs[`/${dir}`] = canvas;
  });
  return { ...await loadSheet(A, DEX_FRAMES, [''], imgs), portraitDirection: A.portraitDirection };
}
export async function loadKitSheet(A: KitArt = KIT_ART): Promise<SpriteSheet> {
  const img = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`);
  const still = img.height <= A.cell; // stills-only sheet (one row of 8): stack them as the 8 idle rows
  const canvas = Object.assign(document.createElement('canvas'), still ? { width: A.cell, height: A.cell * 9 } : { width: img.width, height: img.height });
  if (still) A.dirs.forEach((d, i) => canvas.getContext('2d')!.drawImage(img, i * A.cell, 0, A.cell, A.cell, 0, (i + 1) * A.cell, A.cell, A.cell));
  else canvas.getContext('2d')!.drawImage(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const animRows = { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i + 1])) };
  return { texture, canvas, frameW: A.cell, frameH: A.cell, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows, anims: { idle: { start: 0, frames: A.frames ?? LOOP } }, fps: A.fps, footPx: A.foot };
}
export async function loadWalkerSheet(A: WalkerArt = WALKER1_ART): Promise<SpriteSheet> {
  const S = A.size, n = A.dirs.length, N = A.frames, img = await load(`${import.meta.env.BASE_URL}${A.base}/sheet.png`), o = (A.cell - S) / 2;
  const canvas = Object.assign(document.createElement('canvas'), { width: S * N, height: S * n * 2 });
  const ctx = canvas.getContext('2d')!;
  A.dirs.forEach((d, i) => {
    ctx.drawImage(img, i * A.cell + o, o, S, S, 0, i * S, S, S);                                              // idle: the still
    for (let f = 0; f < N; f++) ctx.drawImage(img, f * A.cell + o, (i + 1) * A.cell + o, S, S, f * S, (n + i) * S, S, S); // walk
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const rows = (base: number) => Object.fromEntries(A.dirs.map((d, i) => [d, base + i]));
  return { texture, canvas, frameW: S, frameH: S, pxPerUnit: A.pxPerUnit, dirs: 8, rows: {}, animRows: { idle: rows(0), walk: rows(n) },
    anims: { idle: { start: 0, frames: 1 }, walk: { start: 0, frames: N } }, fps: 2, walkFps: A.walkFps };
}
export const loadCatSheet = () => loadLoopSheet(CAT_ART);
export const loadDexStandSheet = () => loadLoopSheet(DEX_STAND_ART);

async function loadLoopSheet(A: LoopArt): Promise<SpriteSheet> {
  const S = A.size, url = (n: string) => `${import.meta.env.BASE_URL}${A.base}/${n}.png`;
  const stills = await Promise.all(A.dirs.map((d) => load(url(A.files?.[d] ?? d))));
  const loop = await Promise.all(Array.from({ length: LOOP }, (_, i) => load(url(`idle-${i}`))));
  const canvas = Object.assign(document.createElement('canvas'), { width: S * LOOP, height: S * A.dirs.length * (A.walk ? 2 : 1) });
  const ctx = canvas.getContext('2d')!;
  // the loop frames are 80 px, the stills 48: crop the middle of each
  A.dirs.forEach((d, row) => { for (let f = 0; f < LOOP; f++) { const im = d === 'south' ? loop[f] : stills[row]; ctx.drawImage(im, (im.width - S) / 2, (im.height - S) / 2, S, S, f * S, row * S, S, S); } });
  const animRows: AnimRows = { idle: Object.fromEntries(A.dirs.map((d, i) => [d, i])) }, anims: Anims = { idle: { start: 0, frames: LOOP } };
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

async function loadSheet(A: SheetArt, FRAMES: FrameTable, states: string[], preloaded?: Record<string, CanvasImageSource>): Promise<SpriteSheet> {
  const S = A.size;
  const imgs: Record<string, CanvasImageSource> = preloaded || {};
  if (!preloaded) await Promise.all(states.flatMap((st) => A.dirs.map(async (d) => { imgs[`${st}/${d}`] = await load(`${import.meta.env.BASE_URL}${A.base}/${st ? st + '/' : ''}${d}.png`); })));

  const extra: { name: string; img: HTMLImageElement; frames: number }[] = []; // owner animation sheets that loaded: { name, img, frames }
  for (const [name, x] of Object.entries(A.sheets ?? {})) {
    const img = await load(`${import.meta.env.BASE_URL}${A.base}/${x.file}.png`).catch(() => null);
    if (img) extra.push({ name, img, frames: x.frames });
  }
  const anims = Object.keys(FRAMES).filter((a) => !extra.some((e) => e.name === a)), cols = Math.max(4, ...extra.map((e) => e.frames));
  const canvas = Object.assign(document.createElement('canvas'), { width: S * cols, height: S * A.dirs.length * (anims.length + extra.length) });
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const animRows: AnimRows = {}, sheetAnims: Anims = {};
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
    const cell = A.sheetCell!, o = (cell - S) / 2;
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

// The auditors' walk (optional): public/sprites/auditors/walk/sheet.png, 68 px cells (cropped to 64), same layout as the street walkers: row 0 = unused (the 8 stills),
// rows 1-8 = one direction each in JUNO_ART.dirs order (south, south-east, east, ...), frames side by side (up to 8).
// Missing file = the auditors slide along in their idle loop, as before.
export async function loadAuditorSheet(A = AUDITOR_ART): Promise<SpriteSheet> {
  const sheet = await loadKitSheet(A), img = await load(`${import.meta.env.BASE_URL}${A.base}/${A.walk.file}.png`).catch(() => null);
  if (!img) return sheet;
  const c = A.cell, wc = A.walk.cell, pad = wc - c, n = A.dirs.length, frames = Math.min(8, Math.floor(img.width / wc)), base = sheet.canvas.height / c;
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.max(sheet.canvas.width, frames * c), height: sheet.canvas.height + n * c });
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sheet.canvas, 0, 0);
  // the walk sheet's cells are wc px (68), the stills c px (64): per frame, drop pad/2 px each side and pad px off the top so the feet stay where they were
  A.dirs.forEach((d, i) => { for (let f = 0; f < frames; f++) ctx.drawImage(img, f * wc + pad / 2, (i + 1) * wc + pad, c, c, f * c, sheet.canvas.height + i * c, c, c); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  sheet.texture.dispose();
  return { ...sheet, texture, canvas, animRows: { ...sheet.animRows, walk: Object.fromEntries(A.dirs.map((d, i) => [d, base + i])) }, anims: { ...sheet.anims, walk: { start: 0, frames } }, walkFps: A.walk.walkFps };
}
