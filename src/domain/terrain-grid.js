// Cuadrícula que comparten la malla visible y el rover: las ruedas pisan exactamente lo que se dibuja.
// heightAt_m del modelo procedural difiere de la malla hasta decenas de centímetros, porque la malla interpola.
// Sin dependencias gráficas. Unidades: metros.

export const TERRAIN_HALF_SIZE_M = 7000;
export const TERRAIN_SEGMENTS = 640;
const VERTICES_PER_SIDE = TERRAIN_SEGMENTS + 1;

// Espaciado cuadrático: malla densa cerca del origen y gruesa a lo lejos.
export function gridCoordinate_m(index) {
  const u = -1 + (2 * index) / TERRAIN_SEGMENTS;
  return Math.sign(u) * u * u * TERRAIN_HALF_SIZE_M;
}

function cellOf(coordinate_m) {
  const clamped = Math.min(TERRAIN_HALF_SIZE_M, Math.max(-TERRAIN_HALF_SIZE_M, coordinate_m));
  const u = Math.sign(clamped) * Math.sqrt(Math.abs(clamped) / TERRAIN_HALF_SIZE_M);
  const index = Math.min(TERRAIN_SEGMENTS - 1, Math.max(0, Math.floor(((u + 1) * TERRAIN_SEGMENTS) / 2)));
  const start_m = gridCoordinate_m(index);
  const end_m = gridCoordinate_m(index + 1);
  return { index, fraction: Math.min(1, Math.max(0, (clamped - start_m) / (end_m - start_m))) };
}

export function createTerrainGrid(terrain) {
  const heights = new Float32Array(VERTICES_PER_SIDE * VERTICES_PER_SIDE);
  for (let iz = 0; iz < VERTICES_PER_SIDE; iz++) {
    const z_m = gridCoordinate_m(iz);
    for (let ix = 0; ix < VERTICES_PER_SIDE; ix++) {
      heights[iz * VERTICES_PER_SIDE + ix] = terrain.heightAt_m(gridCoordinate_m(ix), z_m);
    }
  }
  const vertexHeight_m = (ix, iz) => heights[iz * VERTICES_PER_SIDE + ix];

  return {
    vertexHeight_m,
    // Interpola sobre el mismo triángulo que dibuja la malla; la diagonal de cada celda une (x1, z0) con (x0, z1).
    heightAt_m(x_m, z_m) {
      const { index: ix, fraction: s } = cellOf(x_m);
      const { index: iz, fraction: r } = cellOf(z_m);
      const nearCorner = vertexHeight_m(ix, iz);
      const xCorner = vertexHeight_m(ix + 1, iz);
      const zCorner = vertexHeight_m(ix, iz + 1);
      if (s + r <= 1) return nearCorner + s * (xCorner - nearCorner) + r * (zCorner - nearCorner);
      const farCorner = vertexHeight_m(ix + 1, iz + 1);
      return farCorner + (1 - s) * (zCorner - farCorner) + (1 - r) * (xCorner - farCorner);
    },
  };
}
