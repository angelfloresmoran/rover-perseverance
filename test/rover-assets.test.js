import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const MODEL_PATH = 'public/models/mars-2020-perseverance.glb';
const MODEL_SHA256 = '10db7c03a5e63a5a3b3e7baa6243aa4918ba045fa8ff0a731d0217491adc727f';
const DRACO_FILES = ['draco_decoder.wasm', 'draco_wasm_wrapper.js'];

test('el modelo es exactamente el descargado de la NASA', () => {
  const hash = createHash('sha256').update(readFileSync(MODEL_PATH)).digest('hex');
  assert.equal(hash, MODEL_SHA256);
});

test('el decodificador coincide con la versión instalada de Three.js', () => {
  for (const file of DRACO_FILES) {
    const served = readFileSync(`public/draco/${file}`);
    const installed = readFileSync(`node_modules/three/examples/jsm/libs/draco/gltf/${file}`);
    assert.ok(served.equals(installed), `${file} difiere: vuelve a copiarlo`);
  }
});
