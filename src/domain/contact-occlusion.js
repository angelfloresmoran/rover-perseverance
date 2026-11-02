// Oclusión de contacto: cuánta luz del cielo pierde el suelo junto a una roca.
// Modelo aproximado, no una medición. Sin dependencias gráficas. Unidades: metros.

// La roca se trata como una esfera: su centro efectivo queda sobre el suelo porque está semienterrada.
const EFFECTIVE_CENTER_HEIGHT = 0.4;
const INFLUENCE_RADII = 3;

// Factor de forma de una esfera vista desde el suelo, ponderado por el coseno: h·r²/d³.
export function rockOcclusion(groundDistance_m, radius_m) {
  const height_m = EFFECTIVE_CENTER_HEIGHT * radius_m;
  const distance_m = Math.hypot(groundDistance_m, height_m);
  return Math.min(1, (height_m * radius_m * radius_m) / distance_m ** 3);
}

function stampRock(visibility, rock, { minX_m, minZ_m, texel_m, resolution }) {
  const reach_m = rock.radius_m * INFLUENCE_RADII;
  const firstColumn = Math.max(0, Math.floor((rock.x_m - reach_m - minX_m) / texel_m));
  const lastColumn = Math.min(resolution - 1, Math.ceil((rock.x_m + reach_m - minX_m) / texel_m));
  const firstRow = Math.max(0, Math.floor((rock.z_m - reach_m - minZ_m) / texel_m));
  const lastRow = Math.min(resolution - 1, Math.ceil((rock.z_m + reach_m - minZ_m) / texel_m));
  for (let row = firstRow; row <= lastRow; row++) {
    const z_m = minZ_m + (row + 0.5) * texel_m;
    for (let column = firstColumn; column <= lastColumn; column++) {
      const x_m = minX_m + (column + 0.5) * texel_m;
      const distance_m = Math.hypot(x_m - rock.x_m, z_m - rock.z_m);
      if (distance_m <= reach_m) visibility[row * resolution + column] *= 1 - rockOcclusion(distance_m, rock.radius_m);
    }
  }
}

// Hornea las rocas en una cuadrícula: 255 = cielo libre, 0 = totalmente tapado.
// Las rocas más pequeñas que un texel se omiten porque no se podrían representar.
export function bakeContactOcclusion(rocks, { centerX_m, centerZ_m, halfSize_m, resolution }) {
  const grid = {
    minX_m: centerX_m - halfSize_m,
    minZ_m: centerZ_m - halfSize_m,
    texel_m: (2 * halfSize_m) / resolution,
    resolution,
  };
  const visibility = new Float32Array(resolution * resolution).fill(1);
  for (const rock of rocks) {
    if (rock.radius_m >= grid.texel_m) stampRock(visibility, rock, grid);
  }
  return Uint8Array.from(visibility, (value) => Math.round(value * 255));
}
