// Per-scene lighting and look settings, edited in the Neon Editor (/editor.html) and saved to scene-edits.json.
// Each key replaces the time-of-day value while Juno is in that scene; leave a key out to keep the game's own value.
// def = what the game normally uses at night (shown as the starting point in the editor).
export const SCENES = {
  street: 'Lowmarket Street', platform: 'Line 9 Platform', sable: 'Sable Noodle House',
  alley: 'Alley behind the Sable', hostel: "Kit's Capsule Hostel", car: "Juno's Car",
};

export const SCENE_KEYS = [
  { key: 'sky', label: 'Backdrop / sky colour', type: 'color', def: '#0b0b14' },
  { key: 'fog', label: 'Fog colour', type: 'color', def: '#1a1430' },
  { key: 'fogDensity', label: 'Fog thickness', type: 'num', min: 0, max: 0.1, step: 0.001, def: 0.03 },
  { key: 'moon', label: 'Moonlight (main light)', type: 'num', min: 0, max: 3, step: 0.05, def: 0.9 },
  { key: 'moonColor', label: 'Moonlight colour', type: 'color', def: '#8aa0ff' },
  { key: 'hemi', label: 'Fill light (ambient)', type: 'num', min: 0, max: 2, step: 0.05, def: 0.35 },
  { key: 'lightScale', label: 'Lamps and signs strength', type: 'num', min: 0, max: 3, step: 0.05, def: 1 },
  { key: 'rain', label: 'Rain amount', type: 'num', min: 0, max: 1, step: 0.05, def: 1 },
  { key: 'bloom', label: 'Glow (bloom)', type: 'num', min: 0, max: 2, step: 0.05, def: 0.6 },
  { key: 'tiltBlur', label: 'Miniature blur', type: 'num', min: 0, max: 8, step: 0.25, def: 3 },
  { key: 'saturation', label: 'Colour saturation', type: 'num', min: 0, max: 2, step: 0.05, def: 1.15 },
  { key: 'lift', label: 'Shadow tint (R G B)', type: 'vec3', min: -0.1, max: 0.2, step: 0.01, def: [0, 0.01, 0.05] },
  { key: 'gamma', label: 'Midtones (R G B)', type: 'vec3', min: 0.5, max: 1.5, step: 0.01, def: [1, 1, 1] },
  { key: 'gain', label: 'Highlights (R G B)', type: 'vec3', min: 0.5, max: 1.5, step: 0.01, def: [0.95, 1, 1.05] },
];
