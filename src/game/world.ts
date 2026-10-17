import { buildAreas, EXITS, placeAt } from '../world/areas.ts';
import { createCollision } from '../world/collision.ts';
import type * as THREE from 'three';
import type { Spot } from '../types.ts';

// The area records come from src/world/areas.ts; the pieces main hands in are typed structurally here.
export type Areas = ReturnType<typeof buildAreas>;
// collision and road are filled in / read here, whatever the area builders declare.
export type Area = Areas[keyof Areas] & { collision?: ReturnType<typeof createCollision>; road?: [number, number] };
export type Exit = (typeof EXITS)[number];
export type Spawn = [number, number, number?];
export interface WorldDeps {
  scene: THREE.Object3D;
  rng: Parameters<typeof buildAreas>[0];
  lights: { register(list: Area['lights']): void };
  fog: { patch(root: THREE.Object3D): void };
  fade: { out(): Promise<void>; in(): Promise<void> };
  start?: string;
  onEnter?: (area: Area, spawn?: Spawn) => void;
}
export interface World {
  areas: Areas; exits: typeof EXITS;
  readonly current: Area; readonly busy: boolean;
  routeExit(from: string, to: string): Exit | null;
  spot(area: string, name: string): Spot | undefined;
  placeAt: (x: number, z: number) => ReturnType<typeof placeAt>;
  enter(id: string, spawn?: Spawn): Promise<void>;
  jump(id: string, spawn?: Spawn): void;
}

// Owns every area. Areas are built once and sit far apart in world space; entering one hides the others,
// swaps collision and moves the player. onEnter(area, spawn) lets main re-point everything else.
export function createWorld({ scene, rng, lights, fog, fade, start = 'platform', onEnter }: WorldDeps): World {
  const areas = buildAreas(rng) as Areas & Record<string, Area>;
  for (const a of Object.values<Area>(areas)) {
    a.collision = createCollision(a.blocks, a.bounds, { road: a.road });
    a.group.traverse((o: THREE.Object3D) => { const m = o as THREE.Mesh; if (m.isMesh) { m.receiveShadow = true; m.castShadow = !(m.material as THREE.Material).transparent; } });
    lights.register(a.lights);
    fog.patch(a.group);
    scene.add(a.group);
    a.group.visible = false;
  }
  let current: Area = areas[start], busy = false;
  current.group.visible = true;

  // Breadth-first over the door graph: which exit in `from` leads toward `to`.
  function routeExit(from: string, to: string): Exit | null {
    if (from === to) return null;
    const prev = new Map<string, Exit | null>([[from, null]]), q = [from];
    while (q.length) {
      const id = q.shift()!;
      if (id === to) break;
      for (const e of EXITS.filter((x) => x.area === id)) if (!prev.has(e.to)) { prev.set(e.to, e); q.push(e.to); }
    }
    let step = prev.get(to);
    if (!step) return null;
    while (prev.get(step.area)) step = prev.get(step.area)!;
    return step;
  }

  const api: World = {
    areas, exits: EXITS,
    get current() { return current; },
    get busy() { return busy; },
    routeExit,
    spot: (area: string, name: string) => areas[area].spots.find((s: Spot) => s.name === name),
    placeAt: (x: number, z: number) => placeAt(current, x, z),
    // Fade out, switch, fade in. spawn = [x, z, facing].
    async enter(id: string, spawn?: Spawn) {
      if (busy || !areas[id]) return;
      busy = true;
      await fade.out();
      api.jump(id, spawn);
      await fade.in();
      busy = false;
    },
    // Switch right now (no fade): first load, debug skips.
    jump(id: string, spawn?: Spawn) {
      current.group.visible = false;
      current = areas[id];
      current.group.visible = true;
      onEnter?.(current, spawn);
    },
  };
  return api;
}
