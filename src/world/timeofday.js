import * as THREE from 'three';
import { POST } from '../render/post.js';
import { BUILDINGS } from '../gen/buildings.js';
import SCENE_EDITS from './scene-edits.json' with { type: 'json' };

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
  blackout: { // beat 7: every sign dies, only the dashboard glows
    label: 'Blackout', sky: 0x020204, fog: 0x06060e, fogDensity: 0.05, moon: 0.2, moonColor: 0x7088d0, hemi: 0.08,
    lift: [0, 0, 0.02], gamma: [0.95, 0.95, 1], gain: [0.85, 0.92, 1.05], saturation: 0.8,
    signs: 0, flicker: 0, dead: 1, rain: 1,
  },
};
// The strong red sunset Juno arrives in on the street. It is laid over the clock's mood and fades out over SUNSET.seconds (real seconds).
export const SUNSET = {
  seconds: 180,
  mood: {
    label: 'Sunset', sky: 0x6a1a22, fog: 0x4a1830, fogDensity: 0.02, moon: 1.1, moonColor: 0xff8a50, hemi: 0.55,
    lift: [0.03, 0.0, 0.03], gamma: [1, 1, 1], gain: [1.12, 0.97, 0.92], saturation: 1.2,
    signs: 1, flicker: 0.01, dead: 0, rain: 0.5,
  },
};
export const INDOOR = { sky: 0.18, fill: 4.5 }; // multipliers on sky colour and hemisphere light inside rooms
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
  let from, to, cur, t = 1, dur = 0, time = 0, over = {};
  const BASE = { bloom: POST.bloom.strength, tilt: POST.tilt.maxBlur };
  // The scene's own settings (scene-edits.json, made in the Neon Editor) replace the mood's values.
  const withOver = (s) => {
    if (!Object.keys(over).length) return s;
    const r = { ...s };
    for (const k in over) if (k in s) r[k] = COLORS.includes(k) ? new THREE.Color(over[k]) : over[k];
    return r;
  };
  let sunWas = 0;
  const sunsetMood = snapshot(SUNSET.mood);
  const api = { name: 'night', indoor: false, sunset: 0, sunsetScale: 1, sunsetSeconds: SUNSET.seconds }; // sunset 0..1: how much of the red sunset is laid over the mood (outdoors only)

  function apply(s, gradeToo) {
    scene.background.copy(s.sky).multiplyScalar(api.indoor ? INDOOR.sky : 1);
    scene.fog.color.copy(s.fog);
    scene.fog.density = s.fogDensity;
    lights.moon.intensity = s.moon;
    lights.moon.color.copy(s.moonColor);
    lights.hemi.intensity = s.hemi * (api.indoor ? INDOOR.fill : 1);
    particles.rainScale = s.rain;
    if (gradeToo) {
      for (const k of ARRAYS) POST.grade[k] = s[k];
      POST.grade.saturation = s.saturation;
      post.applyUniforms();
    }
  }

  // Rooms get a darker backdrop and a brighter fill than the open street.
  api.setIndoor = (on) => { api.indoor = on; if (cur) apply(withOver(cur), false); };
  api.setScene = (id) => {
    over = SCENE_EDITS[id] ?? {};
    lights.scale = over.lightScale ?? 1;
    api.sunsetScale = over.sunset ?? 1; api.sunsetSeconds = over.sunsetSeconds ?? SUNSET.seconds;
    POST.bloom.strength = over.bloom ?? BASE.bloom;
    POST.tilt.maxBlur = over.tiltBlur ?? BASE.tilt;
    if (cur) apply(withOver(cur), true);
  };
  api.setTimeOfDay = (name, seconds = 0) => {
    api.name = name;
    from = cur ?? snapshot(TIME_OF_DAY[name]);
    to = snapshot(TIME_OF_DAY[name]);
    t = 0; dur = seconds;
  };

  api.update = (dt) => {
    time += dt;
    const sun = api.indoor ? 0 : api.sunset * api.sunsetScale;
    if (t < 1) {
      t = dur > 0 ? Math.min(1, t + dt / dur) : 1;
      cur = blend(from, to, t);
    }
    if (t < 1 || sun > 0 || sunWas > 0) apply(sun > 0 ? blend(withOver(cur), sunsetMood, sun) : withOver(cur), true); // grade is only written while blending, so debug sliders stick afterwards
    sunWas = sun;
    signs.forEach((sg, i) => {
      const p = per[i];
      let k = cur.signs;
      if (p.weak < cur.dead) k = 0;
      else if (hash(i, Math.floor(time * p.rate)) < cur.flicker * (0.5 + p.weak)) k *= FLICKER.offLevel;
      const off = k < cur.signs * 0.5;
      if (off && !p.off && p.weak >= cur.dead) api.onFlicker?.(i); // a sign just blinked off
      p.off = off;
      sg.mat.color.setScalar(BUILDINGS.signGlow * k);
      sg.light.intensity = sg.light.base * k;
    });
  };

  api.setTimeOfDay('night');
  return api;
}
