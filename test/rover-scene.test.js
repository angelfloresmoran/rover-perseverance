// Comprueba el rover contra el terreno y las rocas reales de la escena, sin navegador.
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { ROVER_START } from '../src/app/rover-controller.js';
import { createRoverState, createRoverWorld, stepRover } from '../src/domain/rover-kinematics.js';
import { ROVER_SPEC } from '../src/domain/rover-spec.js';
import { computeStance } from '../src/domain/rover-stance.js';
import { createTerrainGrid } from '../src/domain/terrain-grid.js';
import { createTerrain } from '../src/domain/terrain-height.js';
import { createRocks } from '../src/scene/rocks.js';
import { createTerrainMesh } from '../src/scene/terrain.js';

const SHADOWS_STUB = { attach() {} };
const DT = 1 / 60;
let terrain;
let grid;
let world;
let placements;

before(() => {
  terrain = createTerrain();
  grid = createTerrainGrid(terrain);
  ({ placements } = createRocks(terrain, SHADOWS_STUB));
  world = createRoverWorld({ heightAt_m: grid.heightAt_m, rocks: placements });
});

test('la malla visible pasa exactamente por las alturas que usa el rover', () => {
  const mesh = createTerrainMesh(terrain, grid, SHADOWS_STUB, []);
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 997) {
    const height_m = grid.heightAt_m(positions.getX(i), positions.getZ(i));
    assert.ok(Math.abs(positions.getY(i) - height_m) < 0.002, `vértice ${i}: ${positions.getY(i)} frente a ${height_m}`);
  }
});

test('el rover empieza libre de rocas y en una pendiente suave', () => {
  assert.equal(world.collisionDepth_m(ROVER_START), 0);
  assert.ok(computeStance(ROVER_START, grid.heightAt_m).tilt_deg < 12);
});

test('el rover puede avanzar desde el inicio', () => {
  let state = createRoverState(ROVER_START);
  for (let i = 0; i < 300; i++) state = stepRover(state, { throttle: 1, steer: 0 }, DT, world);
  assert.ok(Math.hypot(state.x_m - ROVER_START.x_m, state.z_m - ROVER_START.z_m) > 3);
});

test('en un recorrido largo las ruedas tocan la malla y se respetan los límites', () => {
  const script = [
    [20, { throttle: 1, steer: 0 }],
    [8, { throttle: 1, steer: 1 }],
    [20, { throttle: 1, steer: 0 }],
    [12, { throttle: 1, steer: -1 }],
    [25, { throttle: 1, steer: 0.5 }],
    [6, { throttle: -1, steer: 0 }],
    [15, { throttle: 1, steer: -0.5 }],
  ];
  let state = createRoverState(ROVER_START);
  const gaps = [];
  let maxTilt = 0;
  for (const [seconds, input] of script) {
    for (let i = 0; i < seconds * 60; i++) {
      state = stepRover(state, input, DT, world);
      const stance = computeStance(state, grid.heightAt_m);
      gaps.push(...stance.wheelGap_m);
      maxTilt = Math.max(maxTilt, stance.tilt_deg);
      assert.equal(world.collisionDepth_m(state), 0, 'atravesó una roca');
    }
  }
  gaps.sort((a, b) => a - b);
  const p95 = gaps[Math.floor(gaps.length * 0.95)];
  assert.ok(p95 <= 0.05, `separación rueda-suelo p95 = ${p95}`);
  assert.ok(maxTilt <= ROVER_SPEC.maxTilt_deg, `inclinación máxima = ${maxTilt}`);
  assert.ok(Math.hypot(state.x_m - ROVER_START.x_m, state.z_m - ROVER_START.z_m) > 10);
});
