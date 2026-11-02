import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bakeContactOcclusion, rockOcclusion } from '../src/domain/contact-occlusion.js';

const GRID = { centerX_m: 0, centerZ_m: 0, halfSize_m: 16, resolution: 64 }; // 0.5 m por texel
const texelAt = (data, x_m, z_m) => {
  const column = Math.floor((x_m + GRID.halfSize_m) / 0.5);
  const row = Math.floor((z_m + GRID.halfSize_m) / 0.5);
  return data[row * GRID.resolution + column];
};

test('la oclusión baja con la distancia y se mantiene entre 0 y 1', () => {
  let previous = Infinity;
  for (let distance_m = 0; distance_m <= 12; distance_m += 0.5) {
    const occlusion = rockOcclusion(distance_m, 2);
    assert.ok(occlusion >= 0 && occlusion <= 1, `fuera de rango: ${occlusion}`);
    assert.ok(occlusion <= previous, `no decrece en ${distance_m} m`);
    previous = occlusion;
  }
  assert.equal(rockOcclusion(0, 2), 1);
  assert.ok(rockOcclusion(6, 2) < 0.02);
});

test('escala con el tamaño de la roca', () => {
  assert.ok(Math.abs(rockOcclusion(1, 1) - rockOcclusion(3, 3)) < 1e-12);
});

test('sin rocas todo queda libre', () => {
  const data = bakeContactOcclusion([], GRID);
  assert.equal(data.length, GRID.resolution ** 2);
  assert.ok(data.every((value) => value === 255));
});

test('la roca oscurece a su alrededor y no a lo lejos', () => {
  const data = bakeContactOcclusion([{ x_m: 0, z_m: 0, radius_m: 2 }], GRID);
  assert.ok(texelAt(data, 0.1, 0.1) < 10, 'bajo la roca');
  assert.ok(texelAt(data, 2.1, 0.1) < texelAt(data, 4.1, 0.1), 'cae con la distancia');
  assert.equal(texelAt(data, 15, 15), 255, 'lejos');
});

test('dos rocas juntas oscurecen más que una', () => {
  const one = bakeContactOcclusion([{ x_m: -2, z_m: 0, radius_m: 2 }], GRID);
  const two = bakeContactOcclusion([{ x_m: -2, z_m: 0, radius_m: 2 }, { x_m: 2, z_m: 0, radius_m: 2 }], GRID);
  assert.ok(texelAt(two, 0.1, 0.1) < texelAt(one, 0.1, 0.1));
});

test('rocas más pequeñas que un texel se omiten', () => {
  const data = bakeContactOcclusion([{ x_m: 0, z_m: 0, radius_m: 0.2 }], GRID);
  assert.ok(data.every((value) => value === 255));
});

test('una roca en el borde o fuera de la cuadrícula no falla', () => {
  const data = bakeContactOcclusion([{ x_m: 15.9, z_m: -15.9, radius_m: 3 }, { x_m: 500, z_m: 500, radius_m: 3 }], GRID);
  assert.ok(texelAt(data, 15.6, -15.6) < 255);
});

test('es determinista', () => {
  const rocks = [{ x_m: 1, z_m: 2, radius_m: 1.5 }, { x_m: -3, z_m: 4, radius_m: 2.5 }];
  assert.deepEqual(bakeContactOcclusion(rocks, GRID), bakeContactOcclusion(rocks, GRID));
});
