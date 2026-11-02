import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTerrain } from '../src/domain/terrain-height.js';

const SAMPLES = [
  [0, 0],
  [120.5, -340.25],
  [-900, 75],
  [2500, 2500],
  [-6800, 6800],
];

test('misma semilla produce la misma altura', () => {
  const a = createTerrain(7);
  const b = createTerrain(7);
  for (const [x, z] of SAMPLES) assert.equal(a.heightAt_m(x, z), b.heightAt_m(x, z));
});

test('semillas distintas producen terrenos distintos', () => {
  const a = createTerrain(7);
  const b = createTerrain(8);
  assert.ok(SAMPLES.some(([x, z]) => a.heightAt_m(x, z) !== b.heightAt_m(x, z)));
});

test('la altura es finita y está en un rango plausible para la escena', () => {
  const terrain = createTerrain(7);
  for (const [x, z] of SAMPLES) {
    const height_m = terrain.heightAt_m(x, z);
    assert.ok(Number.isFinite(height_m));
    assert.ok(height_m > -100 && height_m < 500, `altura fuera de rango: ${height_m}`);
  }
});

test('el borde del cráter eleva el terreno lejano', () => {
  const terrain = createTerrain(7);
  const mean = (radius_m) => {
    let sum = 0;
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      sum += terrain.heightAt_m(Math.cos(angle) * radius_m, Math.sin(angle) * radius_m);
    }
    return sum / 64;
  };
  assert.ok(mean(5000) > mean(300) + 50);
});

test('la pedregosidad está entre 0 y 1', () => {
  const terrain = createTerrain(7);
  for (const [x, z] of SAMPLES) {
    const rockiness = terrain.rockinessAt(x, z);
    assert.ok(rockiness >= 0 && rockiness <= 1);
  }
});
