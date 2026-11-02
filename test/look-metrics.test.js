import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeStats, exactDifference, frameTimeStats, shadowStats } from '../scripts/lib/look-metrics.mjs';

function solidImage(width, height, gray) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = gray;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function paintRect(image, x0, y0, x1, y1, gray) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = gray;
    }
  }
}

test('imágenes iguales no tienen sombra ni cambio', () => {
  const image = solidImage(40, 40, 180);
  const shadow = shadowStats(image, image);
  assert.equal(shadow.area_pct, 0);
  assert.equal(shadow.min, null);
  assert.deepEqual(changeStats(image, image), { pixels_over_1pct: 0, pixels_over_3pct: 0, mean_luminance_change_pct: 0 });
  assert.deepEqual(exactDifference(image, image), { differing_pixels: 0, max_channel_delta: 0 });
});

test('una zona oscurecida se mide en luminancia lineal', () => {
  const lit = solidImage(60, 60, 200);
  const shadowed = solidImage(60, 60, 200);
  paintRect(shadowed, 10, 10, 50, 50, 100);
  const stats = shadowStats(shadowed, lit);
  // sRGB 100 / sRGB 200 en lineal: 0.1274 / 0.5776.
  assert.ok(Math.abs(stats.min - 0.2206) < 0.001, `min = ${stats.min}`);
  // 40² de 54² ventanas posibles (55 %), más el borde que alcanza la ventana de promedio.
  assert.ok(stats.area_pct >= 54.8 && stats.area_pct < 75, `area = ${stats.area_pct}`);
});

test('un píxel aislado no cuenta como sombra', () => {
  const lit = solidImage(40, 40, 200);
  const shadowed = solidImage(40, 40, 200);
  paintRect(shadowed, 20, 20, 21, 21, 150);
  assert.equal(shadowStats(shadowed, lit).area_pct, 0);
});

test('el cambio se cuenta por píxel y separa los umbrales', () => {
  const reference = solidImage(10, 10, 200);
  const image = solidImage(10, 10, 200);
  paintRect(image, 0, 0, 5, 2, 230); // 10 píxeles, cambio grande
  const stats = changeStats(image, reference);
  assert.equal(stats.pixels_over_3pct, 10);
  assert.equal(stats.pixels_over_1pct, 10);
  assert.ok(stats.mean_luminance_change_pct > 0);
});

test('la diferencia exacta encuentra un solo canal distinto', () => {
  const reference = solidImage(4, 4, 100);
  const image = solidImage(4, 4, 100);
  image.data[1] = 103;
  assert.deepEqual(exactDifference(image, reference), { differing_pixels: 1, max_channel_delta: 3 });
});

test('los percentiles de tiempo son robustos al orden', () => {
  const stats = frameTimeStats([33, 16, 16, 17, 16]);
  assert.equal(stats.samples, 5);
  assert.equal(stats.mean_ms, 19.6);
  assert.equal(stats.p50_ms, 16);
  assert.equal(stats.p95_ms, 17);
});
