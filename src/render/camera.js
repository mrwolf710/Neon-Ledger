import * as THREE from 'three';

export const CAMERA = {
  fov: 20,
  yawDeg: 45, pitchDeg: 35, distance: 50,       // start / reset view
  minPitchDeg: 8, maxPitchDeg: 85,
  minDistance: 8, maxDistance: 140,
  orbitSpeed: 0.3,    // degrees per pixel of mouse drag
  rotateSpeed: 90,    // degrees per second while Q/E held
  tiltSpeed: 50,      // degrees per second while R/V held
  wheelZoom: 1.12,    // distance multiplier per wheel notch
  keyZoom: 1.8,       // distance multiplier per second while Z/X held
  panSpeed: 0.5,      // keyboard pan, in view-heights per second (so it scales with zoom); x2 with Shift
  smooth: 14,         // higher = snappier; the view eases toward its goal
  bounds: { x: 26, z: 12 }, // target stays over the district
  near: 0.5,
  far: 500,
};

const d2r = THREE.MathUtils.degToRad, clamp = THREE.MathUtils.clamp;

// Orbit camera around `target`. Inputs change goal values; update() eases the real view toward them.
export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  const goal = { target: new THREE.Vector3(), yaw: 0, pitch: 0, distance: 0 };
  const target = new THREE.Vector3();
  let yaw = 0, pitch = 0, distance = 0;

  function reset() {
    goal.target.set(0, 0, 0);
    goal.yaw = d2r(CAMERA.yawDeg); goal.pitch = d2r(CAMERA.pitchDeg); goal.distance = CAMERA.distance;
  }
  reset();
  target.copy(goal.target); yaw = goal.yaw; pitch = goal.pitch; distance = goal.distance;

  // World units covered by one screen pixel at the target (for drag-pan).
  const unitsPerPixel = () => (2 * distance * Math.tan(d2r(CAMERA.fov) / 2)) / window.innerHeight;

  function moveGoal(right, forward) {
    goal.target.x += Math.cos(goal.yaw) * right - Math.sin(goal.yaw) * forward;
    goal.target.z += -Math.sin(goal.yaw) * right - Math.cos(goal.yaw) * forward;
    goal.target.x = clamp(goal.target.x, -CAMERA.bounds.x, CAMERA.bounds.x);
    goal.target.z = clamp(goal.target.z, -CAMERA.bounds.z, CAMERA.bounds.z);
  }

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
    // Mouse drag in pixels: the ground follows the cursor.
    dragPan(dx, dy) {
      const u = unitsPerPixel();
      moveGoal(-dx * u, (dy * u) / Math.max(0.3, Math.sin(pitch)));
    },
    // Keyboard: x right, y forward (-1..1).
    pan(x, y, dt) {
      const s = CAMERA.panSpeed * unitsPerPixel() * window.innerHeight * dt;
      moveGoal(x * s, y * s);
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
      target.lerp(goal.target, k);
      yaw += (goal.yaw - yaw) * k;
      pitch += (goal.pitch - pitch) * k;
      distance += (goal.distance - distance) * k;
      const flat = Math.cos(pitch) * distance;
      camera.position.set(target.x + Math.sin(yaw) * flat, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * flat);
      camera.lookAt(target);
    },
  };
}
