import * as THREE from 'three';
import { SUN_COLOR, SUN_DIRECTION } from './look.js';

const SHADOW_CENTER = new THREE.Vector3(0, 0, -280);
const SHADOW_HALF_SIZE_M = 620;

export function createLighting() {
  const group = new THREE.Group();

  const sun = new THREE.DirectionalLight(SUN_COLOR, 5.2);
  sun.target.position.copy(SHADOW_CENTER);
  sun.position.copy(SHADOW_CENTER).addScaledVector(SUN_DIRECTION, 1800);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.3;
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_HALF_SIZE_M,
    right: SHADOW_HALF_SIZE_M,
    top: SHADOW_HALF_SIZE_M,
    bottom: -SHADOW_HALF_SIZE_M,
    near: 200,
    far: 3600,
  });

  const skyFill = new THREE.HemisphereLight(
    new THREE.Color().setRGB(0.95, 0.56, 0.32),
    new THREE.Color().setRGB(0.42, 0.19, 0.09),
    1.25,
  );

  group.add(sun, sun.target, skyFill);
  return { group, sun };
}
