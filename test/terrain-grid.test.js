import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTerrain } from '../src/domain/terrain-height.js';
import { createTerrainGrid, gridCoordinate_m, TERRAIN_HALF_SIZE_M, TERRAIN_SEGMENTS } from '../src/domain/terrain-grid.js';

test('las coordenadas de la cuadrícula crecen y llegan a los bordes', () => {
  assert.equal(gridCoordinate_m(0), -TERRAIN_HALF_SIZE_M);
  assert.equal(gridCoordinate_m(TERRAIN_SEGMENTS), TERRAIN_HALF_SIZE_M);
  assert.equal(gridCoordinate_m(TERRAIN_SEGMENTS / 2), 0);
  for (let i = 1; i <= TERRAIN_SEGMENTS; i++) assert.ok(gridCoordinate_m(i) > gridCoordinate_m(i - 1));
});

test('en cada vértice devuelve la altura del vértice', () => {
  const grid = createTerrainGrid(createTerrain(7));
  for (const [ix, iz] of [[320, 320], [321, 322], [400, 250], [10, 600]]) {
    const height_m = grid.heightAt_m(gridCoordinate_m(ix), gridCoordinate_m(iz));
    assert.ok(Math.abs(height_m - grid.vertexHeight_m(ix, iz)) < 1e-4, `vértice ${ix},${iz}`);
  }
});

test('usa la misma diagonal que la malla de PlaneGeometry', () => {
  // Un pico solo en la esquina (x1, z1) no debe afectar al triángulo cercano.
  const ix = 330;
  const iz = 340;
  const peakX = gridCoordinate_m(ix + 1);
  const peakZ = gridCoordinate_m(iz + 1);
  const grid = createTerrainGrid({ heightAt_m: (x, z) => (x === peakX && z === peakZ ? 10 : 0) });
  const x0 = gridCoordinate_m(ix);
  const z0 = gridCoordinate_m(iz);
  const inNearTriangle = grid.heightAt_m(x0 + (peakX - x0) * 0.3, z0 + (peakZ - z0) * 0.3);
  const inFarTriangle = grid.heightAt_m(x0 + (peakX - x0) * 0.8, z0 + (peakZ - z0) * 0.8);
  assert.equal(inNearTriangle, 0);
  assert.ok(Math.abs(inFarTriangle - 6) < 1e-6, `lejano = ${inFarTriangle}`);
});

test('fuera de la cuadrícula no falla ni devuelve valores no finitos', () => {
  const grid = createTerrainGrid(createTerrain(7));
  for (const [x, z] of [[9000, 0], [0, -9000], [TERRAIN_HALF_SIZE_M, TERRAIN_HALF_SIZE_M], [-7000, 7000]]) {
    assert.ok(Number.isFinite(grid.heightAt_m(x, z)));
  }
});
