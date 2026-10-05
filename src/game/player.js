import * as THREE from 'three';

export const PLAYER = {
  walk: 3, run: 6,       // units per second
  accel: 12,             // higher = snappier starts and stops
  radius: 0.3,           // collision circle
  moving: 0.3,           // speed above which the walk animation plays
  runAnim: 1.5,          // most the walk cycle speeds up when running (also sets the footstep rate)
  stuckTime: 0.4,        // seconds without progress before click-to-move gives up
};

// Juno: drives a billboard (from npc.js) with camera-relative movement or click-to-move, colliding via collision.js.
export function createPlayer(billboard, initialCollision) {
  let collision = initialCollision;
  const pos = billboard.position, vel = new THREE.Vector2();
  let goal = null, stuck = 0;

  return {
    position: pos,
    cancel() { goal = null; },
    setCollision(c) { collision = c; goal = null; vel.set(0, 0); },
    get facing() { return billboard.facing; },
    // Walk to point (Vector3, may be a live reference), stop within reach, then call onArrive.
    walkTo(point, reach = 0.15, onArrive = null) { goal = { point, reach, onArrive }; stuck = 0; },
    update(dt, input, camYaw) {
      // Stick/keys: W is up the screen at any camera angle.
      const cx = Math.cos(camYaw), sx = Math.sin(camYaw);
      let wx = input.moveX * cx - input.moveY * sx, wz = -input.moveX * sx - input.moveY * cx;
      if (wx || wz) goal = null; // manual input cancels click-to-move
      else if (goal) {
        const dx = goal.point.x - pos.x, dz = goal.point.z - pos.z, d = Math.hypot(dx, dz);
        if (d <= goal.reach) {
          const done = goal.onArrive; goal = null;
          if (d > 0.01) billboard.facing = Math.atan2(dx, dz); // face what we walked up to
          done?.();
        } else { wx = dx / d; wz = dz / d; }
      }
      const speed = input.run ? PLAYER.run : PLAYER.walk;
      const k = 1 - Math.exp(-PLAYER.accel * dt);
      vel.x += (wx * speed - vel.x) * k;
      vel.y += (wz * speed - vel.y) * k;
      const moved = collision.move(pos, vel.x * dt, vel.y * dt, PLAYER.radius);
      if (goal) { stuck = moved ? 0 : stuck + dt; if (stuck > PLAYER.stuckTime) goal = null; }

      const v = vel.length();
      if (v > PLAYER.moving) billboard.facing = Math.atan2(vel.x, vel.y);
      billboard.anim = v > PLAYER.moving ? 'walk' : 'idle';
      billboard.fpsScale = v > PLAYER.moving ? Math.min(PLAYER.runAnim, Math.max(0.6, v / PLAYER.walk)) : 1;
    },
  };
}
