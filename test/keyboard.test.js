import assert from 'node:assert/strict';
import { test } from 'node:test';
import { driveInputFromKeys } from '../src/app/keyboard.js';

const input = (...codes) => driveInputFromKeys(new Set(codes));

test('WASD y flechas mandan lo mismo', () => {
  assert.deepEqual(input('KeyW'), { throttle: 1, steer: 0 });
  assert.deepEqual(input('ArrowUp'), { throttle: 1, steer: 0 });
  assert.deepEqual(input('KeyS'), { throttle: -1, steer: 0 });
  assert.deepEqual(input('ArrowDown'), { throttle: -1, steer: 0 });
  assert.deepEqual(input('KeyA'), { throttle: 0, steer: 1 });
  assert.deepEqual(input('ArrowLeft'), { throttle: 0, steer: 1 });
  assert.deepEqual(input('KeyD'), { throttle: 0, steer: -1 });
  assert.deepEqual(input('ArrowRight'), { throttle: 0, steer: -1 });
});

test('teclas opuestas se anulan y sin teclas no se mueve', () => {
  assert.deepEqual(input('KeyW', 'KeyS'), { throttle: 0, steer: 0 });
  assert.deepEqual(input('KeyA', 'ArrowRight'), { throttle: 0, steer: 0 });
  assert.deepEqual(input(), { throttle: 0, steer: 0 });
});

test('se pueden combinar avance y giro', () => {
  assert.deepEqual(input('KeyW', 'KeyD'), { throttle: 1, steer: -1 });
});
