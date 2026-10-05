import { DISTRICT } from './district.js';

export const COLLISION = { cell: 0.5 }; // grid cell size in world units

// Walk grid over the street: open between the building lines, blocked under prop/lamp/pillar footprints.
// blocks: district userData.blocks ({ x0, z0, x1, z1 } world AABBs).
export function createCollision(blocks) {
  const D = DISTRICT, c = COLLISION.cell;
  const halfX = D.length / 2, halfZ = D.roadWidth / 2 + D.sidewalkWidth;
  const nx = Math.ceil((halfX * 2) / c), nz = Math.ceil((halfZ * 2) / c);
  const solid = new Uint8Array(nx * nz);
  for (const b of blocks) {
    for (let j = Math.floor((b.z0 + halfZ) / c); j <= Math.floor((b.z1 + halfZ - 1e-6) / c); j++) {
      for (let i = Math.floor((b.x0 + halfX) / c); i <= Math.floor((b.x1 + halfX - 1e-6) / c); i++) {
        if (i >= 0 && j >= 0 && i < nx && j < nz) solid[j * nx + i] = 1;
      }
    }
  }
  // Outside the grid (buildings, street ends) counts as solid.
  const cellSolid = (i, j) => i < 0 || j < 0 || i >= nx || j >= nz || solid[j * nx + i] === 1;

  // Does a circle at (x, z) overlap any solid cell?
  function hits(x, z, r) {
    const i0 = Math.floor((x - r + halfX) / c), i1 = Math.floor((x + r + halfX) / c);
    const j0 = Math.floor((z - r + halfZ) / c), j1 = Math.floor((z + r + halfZ) / c);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!cellSolid(i, j)) continue;
        const cx = Math.max(i * c - halfX, Math.min(x, (i + 1) * c - halfX)); // closest point on the cell
        const cz = Math.max(j * c - halfZ, Math.min(z, (j + 1) * c - halfZ));
        if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  return {
    grid: { nx, nz, solid, cell: c, halfX, halfZ }, // for the minimap
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
