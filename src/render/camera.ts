import * as THREE from 'three';

export const CAMERA = {
  fov: 20,
  yawDeg: 45, pitchDeg: 35, distance: 37.5,       // start / reset view
  exchangeYawDeg: 270,                            // the Echo Exchange opens with the camera looking east: the entrance at the bottom of the screen, right = south (0 = north up, 90 = west up)
  minPitchDeg: 8, maxPitchDeg: 85,
  minDistance: 8, maxDistance: 140,
  orbitSpeed: 0.3,    // degrees per pixel of mouse drag
  rotateSpeed: 90,    // degrees per second while Q/E held
  tiltSpeed: 50,      // degrees per second while R/V held
  wheelZoom: 1.12,    // distance multiplier per wheel notch
  keyZoom: 1.8,       // distance multiplier per second while Z/X held
  smooth: 14,         // higher = snappier; angle and zoom ease toward their goals
  follow: 6,          // how tightly the view follows the player (lower = more lag)
  followHeight: 1,    // look at this height above the player's feet
  near: 0.5,
  far: 500,
};

const d2r = THREE.MathUtils.degToRad, clamp = THREE.MathUtils.clamp;

// Orbit camera around `target` (the player, via follow). Inputs change goals; update() eases toward them.
export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  readonly yaw: number;
  readonly pitch: number;     // the goal pitch and distance (what the player chose), so a cutscene can restore them
  readonly distance: number;
  reset(snap?: boolean): void;
  orbit(dx: number, dy: number): void;
  follow(p: THREE.Vector3, snap?: boolean): void;
  set(v: { yaw?: number; pitch?: number; distance?: number }): void;
  snap(): void;
  rotate(dir: number, dt: number): void;
  tilt(dir: number, dt: number): void;
  zoom(factor: number): void;
  update(dt: number): void;
}

export function createCamera(aspect: number): CameraRig {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  const goal = { target: new THREE.Vector3(), yaw: 0, pitch: 0, distance: 0 };
  const target = new THREE.Vector3();
  let yaw = 0, pitch = 0, distance = 0;

  // snap: jump there at once instead of easing (used when entering a room)
  function reset(snap = false) {
    goal.yaw = d2r(CAMERA.yawDeg); goal.pitch = d2r(CAMERA.pitchDeg); goal.distance = CAMERA.distance;
    if (snap) { yaw = goal.yaw; pitch = goal.pitch; distance = goal.distance; }
  }
  reset();
  target.copy(goal.target); yaw = goal.yaw; pitch = goal.pitch; distance = goal.distance;


  return {
    camera,
    target,
    get yaw() { return yaw; },
    get pitch() { return goal.pitch; },
    get distance() { return goal.distance; },
    reset,
    // Mouse drag in pixels: x turns, y tilts.
    orbit(dx: number, dy: number) {
      goal.yaw -= d2r(dx * CAMERA.orbitSpeed);
      goal.pitch = clamp(goal.pitch + d2r(dy * CAMERA.orbitSpeed), d2r(CAMERA.minPitchDeg), d2r(CAMERA.maxPitchDeg));
    },
    // Look at p (the player); the view catches up with a slight lag. snap = jump there now.
    follow(p: THREE.Vector3, snap = false) {
      goal.target.set(p.x, p.y + CAMERA.followHeight, p.z);
      if (snap) target.copy(goal.target);
    },
    // Scripted shots (trailer): set the view goals directly (radians); snap() makes the view jump there.
    set({ yaw = goal.yaw, pitch = goal.pitch, distance = goal.distance }: { yaw?: number; pitch?: number; distance?: number }) { goal.yaw = yaw; goal.pitch = pitch; goal.distance = distance; }, // any field may be left out
    snap() { target.copy(goal.target); yaw = goal.yaw; pitch = goal.pitch; distance = goal.distance; },
    // dir: -1 / +1 per second (Q/E held).
    rotate(dir: number, dt: number) { goal.yaw += dir * d2r(CAMERA.rotateSpeed) * dt; },
    // dir -1 looks up (flatter), +1 looks down (steeper).
    tilt(dir: number, dt: number) {
      goal.pitch = clamp(goal.pitch + dir * d2r(CAMERA.tiltSpeed) * dt, d2r(CAMERA.minPitchDeg), d2r(CAMERA.maxPitchDeg));
    },
    // factor > 1 zooms out.
    zoom(factor: number) { goal.distance = clamp(goal.distance * factor, CAMERA.minDistance, CAMERA.maxDistance); },
    update(dt: number) {
      const k = 1 - Math.exp(-CAMERA.smooth * dt);
      target.lerp(goal.target, 1 - Math.exp(-CAMERA.follow * dt));
      yaw += (goal.yaw - yaw) * k;
      pitch += (goal.pitch - pitch) * k;
      distance += (goal.distance - distance) * k;
      const flat = Math.cos(pitch) * distance;
      camera.position.set(target.x + Math.sin(yaw) * flat, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * flat);
      camera.lookAt(target);
    },
  };
}
