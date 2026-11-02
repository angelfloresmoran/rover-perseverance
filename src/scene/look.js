// Dirección artística de la escena. Valores ilustrativos, no medidos; colores en RGB lineal.
import * as THREE from 'three';

// Azimut 0° = -Z (hacia donde mira la cámara), positivo a la derecha.
export function skyDirection(azimuth_deg, elevation_deg) {
  const azimuth = THREE.MathUtils.degToRad(azimuth_deg);
  const elevation = THREE.MathUtils.degToRad(elevation_deg);
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(azimuth) * Math.cos(elevation),
  );
}

export const SUN_DIRECTION = skyDirection(23, 8.5);
export const HORIZON_COLOR = new THREE.Color().setRGB(0.84, 0.41, 0.17);
export const SUN_COLOR = new THREE.Color().setRGB(1.0, 0.62, 0.34);
