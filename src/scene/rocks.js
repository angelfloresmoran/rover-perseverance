import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLSL_NOISE } from './glsl-noise.js';

// Muchas piedras pequeñas y pocas grandes. Radio de dispersión medido desde el centro de la vista.
const TIERS = [
  { count: 14000, detail: 1, radius_m: 170, minScale_m: 0.05, maxScale_m: 0.28, castShadow: false },
  { count: 3600, detail: 3, radius_m: 620, minScale_m: 0.28, maxScale_m: 1.7, castShadow: true },
  { count: 170, detail: 6, radius_m: 1100, minScale_m: 1.7, maxScale_m: 6.5, castShadow: true },
];

const VIEW_CENTER = { x: 0, z: -180 };

// Rocas colocadas a mano para dar primer plano a la composición: [x, z, escala_m].
const HERO_ROCKS = [
  [-15, 22, 3.1],
  [-23, 10, 1.7],
  [-7.5, 16, 0.95],
  [17, 16, 2.3],
  [25, 2, 3.6],
  [9, 4, 1.1],
  [-46, -26, 5.4],
  [52, -48, 6.2],
];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Icosaedro recortado por planos al azar: da caras y aristas de roca fracturada.
function createRockGeometry(detail, random) {
  let geometry = new THREE.IcosahedronGeometry(1, detail);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry);

  const planes = Array.from({ length: 13 }, () => ({
    normal: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
    offset: 0.6 + random() * 0.3,
  }));
  const stretch = new THREE.Vector3(0.9 + random() * 0.5, 0.85 + random() * 0.3, 0.85 + random() * 0.4);
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    for (const { normal, offset } of planes) {
      const excess = point.dot(normal) - offset;
      if (excess > 0) point.addScaledVector(normal, -excess);
    }
    point.multiply(stretch);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  return toCreasedNormals(geometry, THREE.MathUtils.degToRad(32));
}

function patchShader(shader) {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      varying float vUpness;
      varying vec3 vRockPos;`,
    )
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      vUpness = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;
      vRockPos = (instanceMatrix * vec4(position, 1.0)).xyz;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying float vUpness;
      varying vec3 vRockPos;
      ${GLSL_NOISE}`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float mottling = fbm3(vRockPos * 1.7);
      float dust = smoothstep(0.25, 0.95, vUpness + (mottling - 0.5) * 0.9);
      diffuseColor.rgb = mix(diffuseColor.rgb * (0.45 + 1.1 * mottling), vec3(0.54, 0.25, 0.11), dust * 0.6);`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      // Rugosidad fina de la piedra.
      float bumpStep = 0.035;
      vec3 bumpPos = vRockPos * 5.5;
      float bump0 = fbm3(bumpPos);
      vec3 bumpGrad = vec3(
        fbm3(bumpPos + vec3(bumpStep, 0.0, 0.0)),
        fbm3(bumpPos + vec3(0.0, bumpStep, 0.0)),
        fbm3(bumpPos + vec3(0.0, 0.0, bumpStep))
      ) - bump0;
      normal = normalize(normal - (viewMatrix * vec4(bumpGrad / bumpStep, 0.0)).xyz * 0.07);`,
    );
}

function createMaterial() {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  material.onBeforeCompile = patchShader;
  return material;
}

function rockColor(random, target) {
  const value = 0.65 + random() * 0.7;
  return target.setRGB(0.21 * value, 0.125 * value, 0.09 * value);
}

function placeInstance(mesh, index, terrain, random, x, z, scale_m, dummy, color) {
  dummy.position.set(x, terrain.heightAt_m(x, z) - scale_m * 0.1, z);
  dummy.rotation.set((random() - 0.5) * 0.5, random() * Math.PI * 2, (random() - 0.5) * 0.5);
  dummy.scale.setScalar(scale_m);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  mesh.setColorAt(index, rockColor(random, color));
}

function createTier(tier, terrain, random, material) {
  const mesh = new THREE.InstancedMesh(createRockGeometry(tier.detail, random), material, tier.count);
  mesh.castShadow = tier.castShadow;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  let attempts = 0;
  while (placed < tier.count && attempts < tier.count * 60) {
    attempts++;
    const angle = random() * Math.PI * 2;
    const distance_m = Math.sqrt(random()) * tier.radius_m;
    const x = VIEW_CENTER.x + Math.cos(angle) * distance_m;
    const z = VIEW_CENTER.z + Math.sin(angle) * distance_m;
    if (random() > 0.12 + 0.88 * terrain.rockinessAt(x, z)) continue;
    // Distribución de ley de potencia: predominan los tamaños pequeños.
    const scale_m = tier.minScale_m * (tier.maxScale_m / tier.minScale_m) ** (random() ** 2.4);
    placeInstance(mesh, placed++, terrain, random, x, z, scale_m, dummy, color);
  }
  mesh.count = placed;
  return mesh;
}

function createHeroRocks(terrain, random, material) {
  const mesh = new THREE.InstancedMesh(createRockGeometry(14, random), material, HERO_ROCKS.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  HERO_ROCKS.forEach(([x, z, scale_m], index) => {
    placeInstance(mesh, index, terrain, random, x, z, scale_m, dummy, color);
  });
  return mesh;
}

export function createRocks(terrain, seed = 21) {
  const random = createRandom(seed);
  const material = createMaterial();
  const group = new THREE.Group();
  for (const tier of TIERS) group.add(createTier(tier, terrain, random, material));
  group.add(createHeroRocks(terrain, random, material));
  return group;
}
