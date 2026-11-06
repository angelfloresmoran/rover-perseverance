import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTracks } from '../src/scene/tracks.js';

const FLAT_GRID = { heightAt_m: () => 0 };
const NO_ROCKS = { rockinessAt: () => 0 };
const STEP_M = 0.05;

function drive(tracks, distance_m) {
  let z_m = 0;
  for (let travelled = 0; travelled < distance_m; travelled += STEP_M) {
    z_m += STEP_M;
    tracks.record({ x_m: 0, z_m, heading_rad: 0 });
  }
}

// Mide la mayor separación entre los vértices de cada triángulo dibujado.
function longestEdge_m(geometry) {
  const positions = geometry.attributes.position;
  const indices = geometry.index.array;
  let longest = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    if (a === b && b === c) continue;
    for (const [p, q] of [[a, b], [b, c]]) {
      longest = Math.max(longest, Math.hypot(positions.getX(p) - positions.getX(q), positions.getZ(p) - positions.getZ(q)));
    }
  }
  return longest;
}

const usedSegments = (geometry) => {
  const indices = geometry.index.array;
  let used = 0;
  for (let i = 0; i < indices.length; i += 12) if (indices[i] !== indices[i + 1]) used++;
  return used;
};

test('antes de moverse no dibuja nada', () => {
  const { mesh } = createTracks(NO_ROCKS, FLAT_GRID);
  assert.equal(usedSegments(mesh.geometry), 0);
});

test('al avanzar crea tramos cortos y conectados', () => {
  const tracks = createTracks(NO_ROCKS, FLAT_GRID);
  const before = tracks.mesh.geometry.index.array.length;
  drive(tracks, 20);
  const used = usedSegments(tracks.mesh.geometry);
  assert.ok(used >= 6 * 90, `tramos = ${used}`);
  assert.ok(longestEdge_m(tracks.mesh.geometry) < 1);
  assert.equal(tracks.mesh.geometry.index.array.length, before);
});

test('la huella queda bajo cada rueda, sobre el suelo', () => {
  const tracks = createTracks(NO_ROCKS, { heightAt_m: () => 12 });
  drive(tracks, 2);
  const positions = tracks.mesh.geometry.attributes.position;
  const firstSampleCenter = 1;
  assert.ok(Math.abs(positions.getX(firstSampleCenter) - 1.062) < 1e-6, `x = ${positions.getX(firstSampleCenter)}`);
  assert.ok(Math.abs(positions.getY(firstSampleCenter) - 12.02) < 1e-5);
});

test('al reciclar el búfer no une la huella nueva con la más antigua', () => {
  const tracks = createTracks(NO_ROCKS, FLAT_GRID);
  const { geometry } = tracks.mesh;
  const allocated = geometry.index.array.length;
  drive(tracks, 700); // Más que los 600 m de capacidad por rueda.
  assert.equal(geometry.index.array.length, allocated, 'la memoria no crece');
  assert.ok(longestEdge_m(geometry) < 1, `arista más larga = ${longestEdge_m(geometry)} m`);
  const positions = geometry.attributes.position;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.count; i++) maxZ = Math.max(maxZ, positions.getZ(i));
  assert.ok(maxZ > 690, `llega hasta ${maxZ} m`);
});
