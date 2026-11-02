import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLSL_NOISE } from './glsl-noise.js';
import { skyDirection, SUN_DIRECTION } from './look.js';

const DISTANCE_M = 6000;

// Tamaños angulares muy agrandados respecto a los reales, para que se lean en cámara.
const MOONS = [
  { name: 'Phobos', azimuth_deg: -14, elevation_deg: 21, angularRadius_deg: 1.75, shape: [1, 0.83, 0.74], craters: 26, seed: 3 },
  { name: 'Deimos', azimuth_deg: -27, elevation_deg: 13.5, angularRadius_deg: 0.8, shape: [1, 0.78, 0.68], craters: 12, seed: 9 },
];

function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function createGeometry({ shape, craters, seed }) {
  const random = createRandom(seed * 1973);
  let geometry = new THREE.IcosahedronGeometry(1, 24);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry);

  const craterList = Array.from({ length: craters }, () => ({
    center: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
    radius: 0.09 + random() ** 2 * 0.34,
  }));
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    let height = 1;
    for (const { center, radius } of craterList) {
      const t = point.distanceTo(center) / radius;
      if (t < 1) height -= radius * 0.28 * (1 - t * t);
      else if (t < 1.3) height += radius * 0.05 * (1 - (t - 1) / 0.3);
    }
    point.multiplyScalar(height).multiply(new THREE.Vector3(...shape));
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createMoon(moon) {
  const direction = skyDirection(moon.azimuth_deg, moon.elevation_deg);
  // Luz desplazada hacia la cámara: a contraluz real serían crecientes casi invisibles.
  const lightDirection = SUN_DIRECTION.clone().addScaledVector(direction, -0.95).normalize();
  const material = new THREE.ShaderMaterial({
    uniforms: { uLightDir: { value: lightDirection } },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vObjectPos;
      void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vObjectPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir;
      varying vec3 vWorldNormal;
      varying vec3 vObjectPos;
      ${GLSL_NOISE}
      void main() {
        float lit = smoothstep(-0.12, 0.95, dot(normalize(vWorldNormal), uLightDir));
        float tone = 0.45 + 1.1 * fbm3(vObjectPos * 5.0);
        vec3 surface = vec3(0.60, 0.40, 0.27) * tone * lit;
        // El lado oscuro se funde con el cielo, velado por la atmósfera.
        gl_FragColor = vec4(surface + vec3(0.33, 0.15, 0.058), 1.0);
      }
    `,
  });
  const radius_m = DISTANCE_M * Math.tan(THREE.MathUtils.degToRad(moon.angularRadius_deg));
  const mesh = new THREE.Mesh(createGeometry(moon), material);
  mesh.name = moon.name;
  mesh.scale.setScalar(radius_m);
  mesh.position.copy(direction).multiplyScalar(DISTANCE_M);
  mesh.renderOrder = -5;
  return mesh;
}

export function createMoons() {
  const group = new THREE.Group();
  for (const moon of MOONS) group.add(createMoon(moon));
  return {
    group,
    update(camera) {
      group.position.copy(camera.position);
    },
  };
}
