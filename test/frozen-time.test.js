import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFrozenTime_s } from '../src/frozen-time.js';

test('acepta segundos válidos', () => {
  assert.equal(parseFrozenTime_s('?t=30'), 30);
  assert.equal(parseFrozenTime_s('?t=0'), 0);
  assert.equal(parseFrozenTime_s('?otro=1&t=12.5'), 12.5);
});

test('sin parámetro no congela', () => {
  assert.equal(parseFrozenTime_s(''), null);
  assert.equal(parseFrozenTime_s('?otro=1'), null);
});

test('rechaza valores vacíos, negativos o no finitos', () => {
  for (const search of ['?t=', '?t=%20', '?t=-1', '?t=abc', '?t=Infinity', '?t=NaN', '?t=1e999']) {
    assert.equal(parseFrozenTime_s(search), null, search);
  }
});
