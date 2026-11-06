import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTrackRecorder } from '../src/domain/track-recorder.js';

const OPTIONS = { wheelCount: 2, capacity: 4, step_m: 0.25 };

test('no registra nada hasta avanzar lo suficiente', () => {
  const recorder = createTrackRecorder(OPTIONS);
  assert.deepEqual(recorder.record(0, 0, 0), []);
  assert.deepEqual(recorder.record(0, 0, 0.1), []);
});

test('la primera vez deja el punto de partida y el tramo recorrido, unidos', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  const samples = recorder.record(0, 0, 0.3);
  assert.equal(samples.length, 2);
  assert.equal(samples[0].previousIndex, null);
  assert.equal(samples[1].previousIndex, samples[0].index);
  assert.ok(Math.abs(samples[1].distance_m - 0.3) < 1e-12);
});

test('la sección queda perpendicular al avance', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  const [, sample] = recorder.record(0, 0, 1);
  assert.equal(sample.crossX * 0 + sample.crossZ * 1, 0);
  assert.equal(Math.hypot(sample.crossX, sample.crossZ), 1);
});

test('el búfer da la vuelta sin crecer', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  const indices = [];
  for (let i = 1; i <= 8; i++) for (const sample of recorder.record(0, 0, i)) indices.push(sample.index);
  assert.deepEqual(indices, [0, 1, 2, 3, 0, 1, 2, 3, 0]);
});

test('tras dar la vuelta, cada muestra se une a la inmediatamente anterior', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  const samples = [];
  for (let i = 1; i <= 6; i++) samples.push(...recorder.record(0, 0, i));
  const wrapped = samples.find((sample, position) => position > 3 && sample.index === 0);
  assert.equal(wrapped.previousIndex, 3);
});

test('al invertir la marcha la sección no se retuerce', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  const [, forward] = recorder.record(0, 0, 1);
  const [backward] = recorder.record(0, 0, 0.5);
  assert.ok(forward.crossX * backward.crossX + forward.crossZ * backward.crossZ > 0);
  assert.ok(backward.distance_m > forward.distance_m);
});

test('cada rueda lleva su propio registro', () => {
  const recorder = createTrackRecorder(OPTIONS);
  recorder.record(0, 0, 0);
  recorder.record(1, 5, 5);
  const [first] = recorder.record(1, 5, 6);
  assert.equal(first.wheelIndex, 1);
  assert.equal(first.x_m, 5);
  assert.equal(first.z_m, 5);
  assert.deepEqual(recorder.record(0, 0, 0.1), []);
});
