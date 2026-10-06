import * as THREE from 'three';

export const CAMERA = {
  fov: 20,
  yawDeg: 45, pitchDeg: 35, distance: 45,       // start / reset view
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
export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  const goal = { target: new THREE.Vector3(), yaw: 0, pitch: 0, distance: 0 };
  const target = new THREE.Vector3();
  let yaw = 0, pitch = 0, distance = 0;

  function reset() {
    goal.yaw = d2r(CAMERA.yawDeg); goal.pitch = d2r(CAMERA.pitchDeg); goal.distance = CAMERA.distance;
  }
  reset();
  target.copy(goal.target); yaw = goal.yaw; pitch = goal.pitch; distance = goal.distance;


  return {
    camera,
    target,
    get yaw() { return yaw; },
    reset,
    // Mouse drag in pixels: x turns, y tilts.
    orbit(dx, dy) {
      goal.yaw -= d2r(dx * CAMERA.orbitSpeed);
      goal.pitch = clamp(goal.pitch + d2r(dy * CAMERA.orbitSpeed), d2r(CAMERA.minPitchDeg), d2r(CAMERA.maxPitchDeg));
    },
    // Look at p (the player); the view catches up with a slight lag. snap = jump there now.
    follow(p, snap = false) {
      goal.target.set(p.x, p.y + CAMERA.followHeight, p.z);
      if (snap) target.copy(goal.target);
    },
    // dir: -1 / +1 per second (Q/E held).
    rotate(dir, dt) { goal.yaw += dir * d2r(CAMERA.rotateSpeed) * dt; },
    // dir -1 looks up (flatter), +1 looks down (steeper).
    tilt(dir, dt) {
      goal.pitch = clamp(goal.pitch + dir * d2r(CAMERA.tiltSpeed) * dt, d2r(CAMERA.minPitchDeg), d2r(CAMERA.maxPitchDeg));
    },
    // factor > 1 zooms out.
    zoom(factor) { goal.distance = clamp(goal.distance * factor, CAMERA.minDistance, CAMERA.maxDistance); },
    update(dt) {
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
