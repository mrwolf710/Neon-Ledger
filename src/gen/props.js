import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

// Street props from primitives. Local frame: base centred on origin, front faces +z (towards the road).
// Each adds to the batch (transform already set) using shared materials, so props cost ~1 draw per material.
export const PROPS = {
  // sidewalk scatter weights and footprint width along the street
  scatter: { crates: 3, bags: 3, vending: 1, stall: 1 },
  width: { crates: 1, bags: 1.2, vending: 1, stall: 2.2 },
  colors: {
    wood: P.rust1, crates: [P.cyanDeep, P.rust2, P.grey3], vendBody: P.magentaDeep, vendGlow: P.cyanLight,
    lantern: P.magenta, bag: P.grey0, pole: P.grey1, lamp: P.amberLight,
  },
  lamp: { height: 4.2, arm: 0.9, glow: 2.5, light: 6 }, // glow: colour multiplier for bloom; light: point intensity
};

let cached = null;

function mats(M) {
  if (cached && cached.M === M) return cached.PM;
  const C = PROPS.colors;
  const std = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const glow = (color) => new THREE.MeshBasicMaterial({ color });
  const PM = {
    wood: std(C.wood), crates: C.crates.map((c) => std(c, 0.6)), vendBody: std(C.vendBody, 0.4),
    vendGlow: glow(C.vendGlow), lantern: glow(C.lantern), bag: std(C.bag, 0.3), pole: std(C.pole, 0.5),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(C.lamp).multiplyScalar(PROPS.lamp.glow) }),
  };
  cached = { M, PM };
  return PM;
}

const cyl = (r, h, x, y, z, seg = 6) => new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z);

export const PROP_BUILDERS = {
  stall(rng, M, batch) {
    const PM = mats(M);
    batch.box(PM.wood, 2.0, 1.0, 0.8, 0, 0.5, -0.2);                     // counter
    batch.box(M.metal, 2.0, 0.08, 0.9, 0, 1.02, -0.15);                    // worktop
    batch.steam(-0.4, 1.1, -0.15);                                          // noodle pot
    batch.spot('stall', 1.55, 0.35);                                        // cook stands beside the counter, facing the street
    for (const x of [-0.95, 0.95]) batch.box(PM.wood, 0.08, 2.1, 0.08, x, 1.05, -0.55); // posts
    batch.box(rng.pick(M.awnings), 2.3, 0.06, 1.3, 0, 2.15, 0.0, 0.25);   // canopy
    for (const x of [-0.6, 0.1, 0.7]) batch.box(PM.lantern, 0.22, 0.3, 0.22, x, 1.75, 0.45);
    for (let i = rng.int(2, 3); i > 0; i--) batch.add(PM.wood, cyl(0.18, 0.5, rng.range(-0.8, 0.8), 0.25, 0.6));
  },

  crates(rng, M, batch) {
    const PM = mats(M), s = 0.6;
    for (let i = 0, n = rng.int(1, 3); i < n; i++) {
      const top = i === 2;
      batch.box(rng.pick(PM.crates), s, s * 0.8, s, top ? 0 : (i - 0.5) * (s + 0.05), s * 0.4 + (top ? s * 0.8 : 0), 0, 0, rng.range(-0.3, 0.3));
    }
  },

  vending(rng, M, batch) {
    const PM = mats(M);
    batch.box(PM.vendBody, 0.9, 1.8, 0.7, 0, 0.9, 0);
    batch.spot('vending', 0, 0.6);                                         // in front of the machine (interactable)
    batch.box(PM.vendGlow, 0.6, 1.0, 0.02, -0.08, 1.15, 0.36);
    batch.box(M.frame, 0.12, 0.5, 0.03, 0.32, 1.1, 0.36);                  // coin slot panel
    batch.box(M.frame, 0.6, 0.18, 0.03, -0.08, 0.3, 0.36);                 // drop tray
  },

  bags(rng, M, batch) {
    const PM = mats(M);
    for (let i = rng.int(2, 4); i > 0; i--) {
      const r = rng.range(0.22, 0.32);
      const g = new THREE.IcosahedronGeometry(r, 0).scale(1, 0.75, 1).rotateY(rng.range(0, Math.PI));
      batch.add(PM.bag, g.translate(rng.range(-0.45, 0.45), r * 0.7, rng.range(-0.2, 0.2)));
    }
  },

  // Pole at origin, arm reaching towards the road (+z). Emissive head plus a registered point light.
  lamp(rng, M, batch) {
    const PM = mats(M), L = PROPS.lamp;
    batch.add(PM.pole, cyl(0.07, L.height, 0, L.height / 2, 0));
    batch.box(PM.pole, 0.08, 0.08, L.arm, 0, L.height - 0.05, L.arm / 2);
    batch.box(PM.lamp, 0.25, 0.08, 0.4, 0, L.height - 0.13, L.arm - 0.1);
    batch.light(PROPS.colors.lamp, L.light, 0, L.height - 0.4, L.arm - 0.1);
  },
};
