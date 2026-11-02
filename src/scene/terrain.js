import * as THREE from 'three';
import { bakeContactOcclusion } from '../domain/contact-occlusion.js';
import { GLSL_NOISE } from './glsl-noise.js';
import { HORIZON_COLOR, SUN_COLOR, SUN_DIRECTION } from './look.js';

const HALF_SIZE_M = 7000;
const SEGMENTS = 640;

// Zona horneada: 0.31 m por texel alrededor de lo que se ve de cerca.
const CONTACT_REGION = { centerX_m: 0, centerZ_m: -180, halfSize_m: 640, resolution: 2048 };

function createContactTexture(rockPlacements) {
  const texture = new THREE.DataTexture(
    bakeContactOcclusion(rockPlacements, CONTACT_REGION),
    CONTACT_REGION.resolution,
    CONTACT_REGION.resolution,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function buildGeometry(terrain) {
  const geometry = new THREE.PlaneGeometry(2, 2, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const rockiness = new Float32Array(positions.count);
  const duneHeight = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    // Espaciado cuadrático: malla densa cerca del origen y gruesa a lo lejos.
    const u = positions.getX(i);
    const v = positions.getZ(i);
    const x = Math.sign(u) * u * u * HALF_SIZE_M;
    const z = Math.sign(v) * v * v * HALF_SIZE_M;
    positions.setXYZ(i, x, terrain.heightAt_m(x, z), z);
    rockiness[i] = terrain.rockinessAt(x, z);
    duneHeight[i] = terrain.duneHeightAt_m(x, z);
  }
  geometry.setAttribute('aRockiness', new THREE.BufferAttribute(rockiness, 1));
  geometry.setAttribute('aDuneHeight', new THREE.BufferAttribute(duneHeight, 1));
  geometry.computeVertexNormals();
  return geometry;
}

function patchShader(shader, contactTexture) {
  shader.uniforms.uSunDir = { value: SUN_DIRECTION };
  shader.uniforms.uHazeColor = { value: HORIZON_COLOR };
  shader.uniforms.uSunColor = { value: SUN_COLOR };
  shader.uniforms.uContactMap = { value: contactTexture };
  const { centerX_m, centerZ_m, halfSize_m } = CONTACT_REGION;
  shader.uniforms.uContactOrigin = { value: new THREE.Vector2(centerX_m - halfSize_m, centerZ_m - halfSize_m) };
  shader.uniforms.uContactSize_m = { value: 2 * halfSize_m };

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      attribute float aRockiness;
      attribute float aDuneHeight;
      varying float vRockiness;
      varying float vDuneHeight;
      varying vec3 vGroundPos;`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vRockiness = aRockiness;
      vDuneHeight = aDuneHeight;
      vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform vec3 uSunDir;
      uniform vec3 uHazeColor;
      uniform vec3 uSunColor;
      uniform sampler2D uContactMap;
      uniform vec2 uContactOrigin;
      uniform float uContactSize_m;
      varying float vRockiness;
      varying float vDuneHeight;
      varying vec3 vGroundPos;
      ${GLSL_NOISE}
      // Ondulitas de viento perpendiculares a la dirección dominante de las dunas.
      float ripples(vec2 q) {
        float warp = noise2(q * 0.07) * 7.0 + noise2(q * 0.31) * 1.4;
        float fine = sin(dot(q, vec2(0.82, 0.57)) * 3.6 + warp);
        float broad = sin(dot(q, vec2(0.78, 0.63)) * 1.15 + warp * 0.6);
        return fine * 0.035 + broad * 0.075;
      }
      float groundRelief(vec2 q, float rockiness, float dist) {
        float sand = ripples(q) * (1.0 - rockiness) * (1.0 - smoothstep(60.0, 260.0, dist));
        float grit = (fbm2(q * 2.3) - 0.5) * mix(0.03, 0.22, rockiness) * (1.0 - smoothstep(40.0, 180.0, dist));
        return sand + grit;
      }`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 groundXZ = vGroundPos.xz;
      float broadTone = fbm2(groundXZ * 0.012);
      float fineTone = fbm2(groundXZ * 0.4);
      vec3 sand = mix(vec3(0.50, 0.19, 0.075), vec3(0.74, 0.36, 0.15), smoothstep(0.32, 0.72, broadTone));
      float trough = (1.0 - vRockiness) * (1.0 - smoothstep(0.0, 5.5, vDuneHeight));
      sand = mix(sand, vec3(0.17, 0.08, 0.055), trough * 0.72);
      vec3 gravel = mix(vec3(0.20, 0.10, 0.065), vec3(0.42, 0.20, 0.10), fineTone);
      vec3 groundColor = mix(sand, gravel, smoothstep(0.35, 0.9, vRockiness) * 0.8);
      diffuseColor.rgb = groundColor * (0.86 + 0.28 * fineTone);`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      float reliefDist = length(vViewPosition);
      if (reliefDist < 260.0) {
        float epsilon = 0.06 + reliefDist * 0.004;
        float h0 = groundRelief(groundXZ, vRockiness, reliefDist);
        float hx = groundRelief(groundXZ + vec2(epsilon, 0.0), vRockiness, reliefDist);
        float hz = groundRelief(groundXZ + vec2(0.0, epsilon), vRockiness, reliefDist);
        vec3 bump = vec3(h0 - hx, 0.0, h0 - hz) / epsilon;
        normal = normalize(normal + (viewMatrix * vec4(bump, 0.0)).xyz);
      }
      // A lo lejos el relieve se aplana: la silueta manda y no brillan facetas sueltas de la malla.
      normal = normalize(mix(normal, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz, smoothstep(1300.0, 3200.0, reliefDist) * 0.85));`,
    )
    .replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      // Junto a las rocas el suelo ve menos cielo. Solo afecta a la luz indirecta.
      vec2 contactUv = (vGroundPos.xz - uContactOrigin) / uContactSize_m;
      if (all(greaterThanEqual(contactUv, vec2(0.0))) && all(lessThanEqual(contactUv, vec2(1.0)))) {
        reflectedLight.indirectDiffuse *= texture2D(uContactMap, contactUv).r;
      }`,
    )
    .replace(
      '#include <fog_fragment>',
      `#include <fog_fragment>
      vec3 viewRay = vGroundPos - cameraPosition;
      float viewDist = length(viewRay);
      // Bruma baja en los valles y luz del sol dispersada por el polvo.
      float lowHaze = smoothstep(16.0, -10.0, vGroundPos.y) * (1.0 - exp(-viewDist * 0.0011));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, lowHaze * 0.55);
      float toSun = pow(max(dot(viewRay / viewDist, uSunDir), 0.0), 7.0);
      gl_FragColor.rgb += uSunColor * toSun * (1.0 - exp(-viewDist * 0.0007)) * 0.35;`,
    );
}

export function createTerrainMesh(terrain, shadows, rockPlacements) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
  const contactTexture = createContactTexture(rockPlacements);
  material.onBeforeCompile = (shader) => patchShader(shader, contactTexture);
  shadows.attach(material, 'terrain');
  const mesh = new THREE.Mesh(buildGeometry(terrain), material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
