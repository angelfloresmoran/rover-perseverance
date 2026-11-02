// Modelo de altura procedural e ilustrativo (no son datos reales de Marte).
// Sin dependencias gráficas. Unidades: metros.

const fract = (x) => x - Math.floor(x);
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash2(ix, iz, seed) {
  return fract(Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453);
}

function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const u = smoothstep(0, 1, x - ix);
  const v = smoothstep(0, 1, z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z, seed, octaves) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * valueNoise(x * frequency, z * frequency, seed + i);
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum;
}

// Barlovento suave y cara de avalancha corta, con cresta marcada.
function duneProfile(phase) {
  const p = fract(phase);
  const crest = 0.74;
  return p < crest ? smoothstep(0, 1, p / crest) : 1 - smoothstep(0, 1, (p - crest) / (1 - crest));
}

function duneHeight_m(x, z, seed) {
  const warp = fbm(x * 0.004, z * 0.004, seed + 10, 3) * 3.2;
  const across = x * 0.82 + z * 0.57;
  const presence = smoothstep(0.34, 0.62, fbm(x * 0.0018 + 5, z * 0.0018, seed + 20, 3));
  const large = duneProfile(across / 165 + warp) * 15;
  const small = duneProfile(across / 58 + warp * 1.7 + 0.3) * 3.2;
  return (large + small) * presence;
}

function craterRimHeight_m(x, z, seed) {
  const distance_m = Math.hypot(x, z);
  const rise = smoothstep(1500, 4200, distance_m);
  if (rise === 0) return 0;
  const ridged = 1 - Math.abs(2 * fbm(x * 0.0016, z * 0.0016, seed + 30, 5) - 1);
  return rise * (70 + 300 * ridged * ridged);
}

export function createTerrain(seed = 7) {
  return {
    heightAt_m(x, z) {
      const base = (fbm(x * 0.0022, z * 0.0022, seed, 5) - 0.5) * 42;
      const detail = (fbm(x * 0.05, z * 0.05, seed + 40, 3) - 0.5) * 0.9;
      return base + detail + duneHeight_m(x, z, seed) + craterRimHeight_m(x, z, seed);
    },
    duneHeightAt_m(x, z) {
      return duneHeight_m(x, z, seed);
    },
    // Las rocas abundan donde no hay dunas: 0 (arena) a 1 (pedregal).
    rockinessAt(x, z) {
      return 1 - smoothstep(0.34, 0.58, fbm(x * 0.0018 + 5, z * 0.0018, seed + 20, 3));
    },
  };
}
