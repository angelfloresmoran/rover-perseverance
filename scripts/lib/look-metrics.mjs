// Métricas puras sobre imágenes RGBA ({ data, width, height }), sin navegador ni Three.js.

const srgbToLinear = (value) => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const LINEAR = Float64Array.from({ length: 256 }, (_, value) => srgbToLinear(value));

function luminanceMap({ data, width, height }) {
  const map = new Float64Array(width * height);
  for (let p = 0; p < map.length; p++) {
    const i = p * 4;
    map[p] = 0.2126 * LINEAR[data[i]] + 0.7152 * LINEAR[data[i + 1]] + 0.0722 * LINEAR[data[i + 2]];
  }
  return map;
}

function integralImage(map, width, height) {
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += map[y * width + x];
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row;
    }
  }
  return integral;
}

function boxSum(integral, width, x0, y0, x1, y1) {
  const stride = width + 1;
  return integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
}

const round = (value, digits = 3) => Number(value.toFixed(digits));
const percentile = (sorted, q) => (sorted.length === 0 ? null : round(sorted[Math.floor((sorted.length - 1) * q)]));

// Cuánta luz conserva cada zona en sombra frente a la misma zona sin sombras.
// Promedia en una ventana para que un píxel suelto no cuente como sombra.
export function shadowStats(shadowed, unshadowed, { windowSize = 7, threshold = 0.9 } = {}) {
  const { width, height } = shadowed;
  const a = integralImage(luminanceMap(shadowed), width, height);
  const b = integralImage(luminanceMap(unshadowed), width, height);
  const half = windowSize >> 1;
  const ratios = [];
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      const sumB = boxSum(b, width, x - half, y - half, x + half + 1, y + half + 1);
      if (sumB <= 0) continue;
      const ratio = boxSum(a, width, x - half, y - half, x + half + 1, y + half + 1) / sumB;
      if (ratio < threshold) ratios.push(ratio);
    }
  }
  ratios.sort((p, q) => p - q);
  return {
    area_pct: round((ratios.length / ((width - windowSize + 1) * (height - windowSize + 1))) * 100, 2),
    min: percentile(ratios, 0),
    p05: percentile(ratios, 0.05),
    p50: percentile(ratios, 0.5),
    p95: percentile(ratios, 0.95),
  };
}

// Qué tanto cambia una imagen respecto a otra: sirve para medir polvo y movimiento.
export function changeStats(image, reference) {
  const a = luminanceMap(image);
  const b = luminanceMap(reference);
  let over1 = 0;
  let over3 = 0;
  let sumA = 0;
  let sumB = 0;
  for (let p = 0; p < a.length; p++) {
    const relative = Math.abs(a[p] - b[p]) / Math.max(b[p], 0.01);
    if (relative > 0.01) over1++;
    if (relative > 0.03) over3++;
    sumA += a[p];
    sumB += b[p];
  }
  return {
    pixels_over_1pct: round((over1 / a.length) * 100, 2),
    pixels_over_3pct: round((over3 / a.length) * 100, 2),
    mean_luminance_change_pct: round((sumB > 0 ? sumA / sumB - 1 : 0) * 100, 2),
  };
}

export function exactDifference(image, reference) {
  const { data } = image;
  let differing = 0;
  let maxChannelDelta = 0;
  for (let i = 0; i < data.length; i += 4) {
    let delta = 0;
    for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(data[i + c] - reference.data[i + c]));
    if (delta > 0) differing++;
    if (delta > maxChannelDelta) maxChannelDelta = delta;
  }
  return { differing_pixels: differing, max_channel_delta: maxChannelDelta };
}

export function frameTimeStats(frames_ms) {
  const sorted = [...frames_ms].sort((p, q) => p - q);
  const total_ms = sorted.reduce((sum, value) => sum + value, 0);
  return {
    samples: sorted.length,
    mean_ms: sorted.length === 0 ? null : round(total_ms / sorted.length),
    p50_ms: percentile(sorted, 0.5),
    p95_ms: percentile(sorted, 0.95),
  };
}
