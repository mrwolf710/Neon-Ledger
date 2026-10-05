import * as THREE from 'three';

export const CAMERA = {
  fov: 20,
  pitchDeg: 35,
  minPitchDeg: 8,    // R held: look up toward the skyline
  maxPitchDeg: 80,   // V held: look down toward top-down
  tiltSpeed: 40,     // degrees per second
  yawDeg: 45,
  distance: 75,
  minDistance: 12,
  maxDistance: 140,
  rotateMs: 300,
  rotateStepDeg: 30, // Q/E swing per press
  zoomSpeed: 60,  // units per second while Z/X held
  wheelStep: 6,   // units per wheel notch
  panSpeed: 12,   // units per second (WASD free-look until there is a player); x2 with Shift
  near: 1,
  far: 500,
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Orbit camera: fixed pitch, yaw snaps in rotateStepDeg steps around `target`.
export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  const target = new THREE.Vector3();
  let pitch = THREE.MathUtils.degToRad(CAMERA.pitchDeg);
  let yaw = THREE.MathUtils.degToRad(CAMERA.yawDeg);
  let fromYaw = yaw, toYaw = yaw, t = 1;
  let distance = CAMERA.distance;

  function place() {
    const flat = Math.cos(pitch) * distance;
    camera.position.set(
      target.x + Math.sin(yaw) * flat,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * flat,
    );
    camera.lookAt(target);
  }
  place();

  return {
    camera,
    target,
    get yaw() { return yaw; },
    rotate(dir) {
      fromYaw = yaw;
      toYaw += dir * THREE.MathUtils.degToRad(CAMERA.rotateStepDeg);
      t = 0;
    },
    // Moves the target on the ground, relative to the view: x right, y forward (into the screen).
    pan(x, y, dt) {
      const s = CAMERA.panSpeed * dt;
      target.x += (Math.cos(yaw) * x - Math.sin(yaw) * y) * s;
      target.z += (-Math.sin(yaw) * x - Math.cos(yaw) * y) * s;
    },
    // dir -1 looks up (flatter), +1 looks down (steeper).
    tilt(dir, dt) {
      const d = THREE.MathUtils.degToRad;
      pitch = THREE.MathUtils.clamp(pitch + dir * d(CAMERA.tiltSpeed) * dt, d(CAMERA.minPitchDeg), d(CAMERA.maxPitchDeg));
    },
    zoom(delta) {
      distance = THREE.MathUtils.clamp(distance + delta, CAMERA.minDistance, CAMERA.maxDistance);
    },
    update(dt) {
      if (t < 1) {
        t = Math.min(1, t + (dt * 1000) / CAMERA.rotateMs);
        yaw = fromYaw + (toYaw - fromYaw) * easeInOutCubic(t);
      }
      place();
    },
  };
}
