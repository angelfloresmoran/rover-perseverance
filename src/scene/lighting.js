import * as THREE from 'three';
import { createShadows } from './shadows.js';

export function createLighting(camera) {
  const group = new THREE.Group();

  // El sol son las luces de las cascadas de sombra.
  const shadows = createShadows(camera, group);

  // Menos relleno del cielo para que la sombra se lea; el rebote de la arena evita rocas negras.
  const skyFill = new THREE.HemisphereLight(
    new THREE.Color().setRGB(0.95, 0.56, 0.32),
    new THREE.Color().setRGB(0.68, 0.33, 0.16),
    0.92,
  );

  group.add(skyFill);
  return { group, shadows };
}
