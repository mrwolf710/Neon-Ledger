import * as THREE from 'three';
import type { Billboard } from './npc.ts';

export const PLAYER = {
  walk: 3, run: 6, sneak: 1.5,   // units per second
  fidgetAfter: 7,        // seconds standing still before she checks her tablet
  accel: 12,             // higher = snappier starts and stops
  radius: 0.3,           // collision circle
  moving: 0.3,           // speed above which the walk animation plays
  runAnim: 1.5,          // most the walk cycle speeds up when running (also sets the footstep rate)
  stuckTime: 0.4,        // seconds without progress before click-to-move gives up
};

// Juno: drives a billboard (from npc.js) with camera-relative movement or click-to-move, colliding via collision.js.
// What the player needs from the collision world and the input module (typed structurally; the real ones live in src/world and src/core).
export interface PlayerCollision { move(pos: THREE.Vector3, dx: number, dz: number, radius: number): boolean }
export interface PlayerInput { moveX: number; moveY: number; run: boolean; held(a: string): boolean }
export interface Player {
  position: THREE.Vector3;
  cancel(): void;
  setPose(p: string | null): void;
  setCollision(c: PlayerCollision): void;
  readonly facing: number;
  walkTo(point: { x: number; z: number }, reach?: number, onArrive?: (() => void) | null): void;
  update(dt: number, input: PlayerInput, camYaw: number, idleOk?: boolean): void;
}
interface Goal { point: { x: number; z: number }; reach: number; onArrive: (() => void) | null }
export function createPlayer(billboard: Billboard, initialCollision: PlayerCollision): Player {
  let collision = initialCollision;
  const pos = billboard.position, vel = new THREE.Vector2();
  let goal: Goal | null = null, stuck = 0, pose: string | null = null, forced = false, idle = 0;

  return {
    position: pos,
    cancel() { goal = null; },
    // Hold a pose while standing ('tablet'); null releases it. Any movement also releases it.
    setPose(p: string | null) { pose = p; forced = !!p; idle = 0; },
    setCollision(c: PlayerCollision) { collision = c; goal = null; vel.set(0, 0); },
    get facing() { return billboard.facing; },
    // Walk to point (Vector3, may be a live reference), stop within reach, then call onArrive.
    walkTo(point: { x: number; z: number }, reach = 0.15, onArrive: (() => void) | null = null) { goal = { point, reach, onArrive }; stuck = 0; },
    // idleOk: false during conversations / menus, so she doesn't start fidgeting mid-scene.
    update(dt: number, input: PlayerInput, camYaw: number, idleOk = true) {
      if (pose === 'sit') { goal = null; vel.set(0, 0); billboard.anim = 'sit'; billboard.fpsScale = 1; return; } // seated (the car): she stays in her seat
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
      const sneaking = input.held('sneak') && !input.run && !goal;
      const speed = sneaking ? PLAYER.sneak : input.run ? PLAYER.run : PLAYER.walk;
      const k = 1 - Math.exp(-PLAYER.accel * dt);
      vel.x += (wx * speed - vel.x) * k;
      vel.y += (wz * speed - vel.y) * k;
      const moved = collision.move(pos, vel.x * dt, vel.y * dt, PLAYER.radius);
      if (goal) { stuck = moved ? 0 : stuck + dt; if (stuck > PLAYER.stuckTime) goal = null; }

      const v = vel.length();
      if (v > PLAYER.moving) billboard.facing = Math.atan2(vel.x, vel.y);
      const moving = v > PLAYER.moving;
      if (moving && !forced) { pose = null; idle = 0; } else if (!moving) idle += dt;
      if (!moving && idleOk && pose === null && idle > PLAYER.fidgetAfter) pose = 'tablet';
      billboard.anim = moving ? (sneaking ? 'sneak' : input.run && !goal ? 'run' : 'walk') : (pose ?? 'idle');
      billboard.fpsScale = moving ? (sneaking ? Math.min(1.2, Math.max(0.6, v / PLAYER.sneak)) : Math.min(PLAYER.runAnim, Math.max(0.6, v / PLAYER.walk))) : 1;
    },
  };
}
