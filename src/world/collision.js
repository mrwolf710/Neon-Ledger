import { DISTRICT } from './district.js';

export const COLLISION = { cell: 0.5 }; // grid cell size in world units

// Walkable rectangle of the street: between the building lines.
export const streetBounds = () => {
  const D = DISTRICT, hz = D.roadWidth / 2 + D.sidewalkWidth;
  return { x0: -D.length / 2, z0: -hz, x1: D.length / 2, z1: hz };
};

// Walk grid over a rectangle (bounds { x0, z0, x1, z1 }, default the street): open inside, blocked under footprints.
// blocks: world AABBs { x0, z0, x1, z1 } (props, furniture, inner walls). opts.road = [z0, z1] band for the minimap.
export function createCollision(blocks, bounds = streetBounds(), opts = {}) {
  const c = COLLISION.cell, ox = bounds.x0, oz = bounds.z0;
  const nx = Math.ceil((bounds.x1 - ox) / c), nz = Math.ceil((bounds.z1 - oz) / c);
  const solid = new Uint8Array(nx * nz);
  for (const b of blocks) {
    for (let j = Math.floor((b.z0 - oz) / c); j <= Math.floor((b.z1 - oz - 1e-6) / c); j++) {
      for (let i = Math.floor((b.x0 - ox) / c); i <= Math.floor((b.x1 - ox - 1e-6) / c); i++) {
        if (i >= 0 && j >= 0 && i < nx && j < nz) solid[j * nx + i] = 1;
      }
    }
  }
  // Outside the grid (walls, street ends) counts as solid.
  const cellSolid = (i, j) => i < 0 || j < 0 || i >= nx || j >= nz || solid[j * nx + i] === 1;

  // Does a circle at (x, z) overlap any solid cell?
  function hits(x, z, r) {
    const i0 = Math.floor((x - r - ox) / c), i1 = Math.floor((x + r - ox) / c);
    const j0 = Math.floor((z - r - oz) / c), j1 = Math.floor((z + r - oz) / c);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!cellSolid(i, j)) continue;
        const cx = Math.max(ox + i * c, Math.min(x, ox + (i + 1) * c)); // closest point on the cell
        const cz = Math.max(oz + j * c, Math.min(z, oz + (j + 1) * c));
        if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  return {
    grid: { nx, nz, solid, cell: c, x0: ox, z0: oz, road: opts.road ?? null }, // for the minimap
    bounds,
    hits,
    // Moves pos (Vector3) by (dx, dz), one axis at a time so blocked motion slides along walls. Returns true if moved.
    // Long moves are split into small steps so fast motion can't tunnel through a cell.
    move(pos, dx, dz, r) {
      const x0 = pos.x, z0 = pos.z, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (c * 0.4)));
      for (let k = 0; k < n; k++) {
        if (!hits(pos.x + dx / n, pos.z, r)) pos.x += dx / n;
        if (!hits(pos.x, pos.z + dz / n, r)) pos.z += dz / n;
      }
      return pos.x !== x0 || pos.z !== z0;
    },
  };
}
