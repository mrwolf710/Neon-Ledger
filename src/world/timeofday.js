import * as THREE from 'three';
import { POST } from '../render/post.js';
import { BUILDINGS } from '../gen/buildings.js';

// Lighting moods. Colours are 0xRRGGBB; grade arrays are RGB. signs = sign brightness, flicker = chance a sign
// blinks off per step, dead = fraction of signs fully off, rain = fraction of rain drops shown.
export const TIME_OF_DAY = {
  lateEvening: {
    label: 'Late Evening', sky: 0x2a1f4a, fog: 0x2e2448, fogDensity: 0.02, moon: 0.5, moonColor: 0xb0a8ff, hemi: 0.6,
    lift: [0.03, 0.01, 0.05], gamma: [1, 1, 1], gain: [1.05, 1, 1.05], saturation: 1.1,
    signs: 1, flicker: 0.01, dead: 0, rain: 0.5,
  },
  night: {
    label: 'Night', sky: 0x0b0b14, fog: 0x1a1430, fogDensity: 0.03, moon: 0.9, moonColor: 0x8aa0ff, hemi: 0.35,
    lift: [0, 0.01, 0.05], gamma: [1, 1, 1], gain: [0.95, 1, 1.05], saturation: 1.15,
    signs: 1, flicker: 0.04, dead: 0, rain: 1,
  },
  deadHour: {
    label: 'Dead Hour', sky: 0x040408, fog: 0x0c0c1a, fogDensity: 0.045, moon: 0.45, moonColor: 0x7088d0, hemi: 0.18,
    lift: [0, 0, 0.03], gamma: [0.95, 0.95, 1], gain: [0.9, 0.95, 1.05], saturation: 0.85,
    signs: 0.75, flicker: 0.3, dead: 0.25, rain: 1,
  },
};
export const FLICKER = { rate: [3, 12], offLevel: 0.06 }; // steps per second per sign, brightness when off

const COLORS = ['sky', 'fog', 'moonColor'];
const ARRAYS = ['lift', 'gamma', 'gain'];
const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

function snapshot(def) {
  const s = { ...def };
  for (const k of COLORS) s[k] = new THREE.Color(def[k]);
  for (const k of ARRAYS) s[k] = [...def[k]];
  return s;
}

function blend(a, b, t) {
  const s = {};
  for (const k in b) {
    if (COLORS.includes(k)) s[k] = a[k].clone().lerp(b[k], t);
    else if (ARRAYS.includes(k)) s[k] = a[k].map((v, i) => THREE.MathUtils.lerp(v, b[k][i], t));
    else if (typeof b[k] === 'number') s[k] = THREE.MathUtils.lerp(a[k], b[k], t);
  }
  return s;
}

// signs: district userData.signs ({ mat, light }). Blends all values over `seconds` in setTimeOfDay.
export function createTimeOfDay({ scene, lights, post, particles, signs, rng }) {
  const per = signs.map(() => ({ rate: rng.range(...FLICKER.rate), weak: rng.rand() }));
  let from, to, cur, t = 1, dur = 0, time = 0;
  const api = { name: 'night' };

  function apply(s, gradeToo) {
    scene.background.copy(s.sky);
    scene.fog.color.copy(s.fog);
    scene.fog.density = s.fogDensity;
    lights.moon.intensity = s.moon;
    lights.moon.color.copy(s.moonColor);
    lights.hemi.intensity = s.hemi;
    particles.rainScale = s.rain;
    if (gradeToo) {
      for (const k of ARRAYS) POST.grade[k] = s[k];
      POST.grade.saturation = s.saturation;
      post.applyUniforms();
    }
  }

  api.setTimeOfDay = (name, seconds = 0) => {
    api.name = name;
    from = cur ?? snapshot(TIME_OF_DAY[name]);
    to = snapshot(TIME_OF_DAY[name]);
    t = 0; dur = seconds;
  };

  api.update = (dt) => {
    time += dt;
    if (t < 1) {
      t = dur > 0 ? Math.min(1, t + dt / dur) : 1;
      cur = blend(from, to, t);
      apply(cur, true); // grade is only written while blending, so debug sliders stick afterwards
    }
    signs.forEach((sg, i) => {
      const p = per[i];
      let k = cur.signs;
      if (p.weak < cur.dead) k = 0;
      else if (hash(i, Math.floor(time * p.rate)) < cur.flicker * (0.5 + p.weak)) k *= FLICKER.offLevel;
      sg.mat.color.setScalar(BUILDINGS.signGlow * k);
      sg.light.intensity = sg.light.base * k;
    });
  };

  api.setTimeOfDay('night');
  return api;
}
