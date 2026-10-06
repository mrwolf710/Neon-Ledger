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
export async function loadJunoSheet() {
  const A = JUNO_ART, S = A.size;
  const states = ['idle', 'walk', 'sneak', 'tablet'];
  const imgs = {};
  await Promise.all(states.flatMap((st) => A.dirs.map(async (d) => { imgs[`${st}/${d}`] = await load(`${import.meta.env.BASE_URL}${A.base}/${st}/${d}.png`); })));

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
