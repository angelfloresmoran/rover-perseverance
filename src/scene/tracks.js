import * as THREE from 'three';
import { ROVER_SPEC } from '../domain/rover-spec.js';
import { wheelGroundPosition } from '../domain/rover-stance.js';
import { createTrackRecorder } from '../domain/track-recorder.js';

const STEP_M = 0.2;
const SAMPLES_PER_WHEEL = 3000; // 600 m por rueda; después se reutiliza lo más antiguo.
const HALF_WIDTH_M = 0.168; // Mitad del ancho de la rueda en el modelo.
const LIFT_M = 0.02;
const VERTICES_PER_SAMPLE = 3;
const INDICES_PER_SEGMENT = 12;
const WHEEL_COUNT = ROVER_SPEC.wheels.length;

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  // Multiplica el color del suelo ya iluminado: conserva sombras, bruma y relieve sin recalcular la luz.
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.ZeroFactor,
  blendDst: THREE.SrcColorFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */ `
    attribute vec3 aTrack;
    varying vec3 vTrack;
    varying float vViewDistance;
    void main() {
      vTrack = aTrack;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDistance = -viewPosition.z;
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  // Marcas de las garras: ilustrativas, con separación agrandada para que se lean en cámara.
  fragmentShader: /* glsl */ `
    varying vec3 vTrack;
    varying float vViewDistance;
    const float GROUSER_SPACING_M = 0.09;
    void main() {
      float across = abs(vTrack.x);
      float distance_m = vTrack.y + 0.05 * across * across;
      float phase = distance_m * 6.2831853 / GROUSER_SPACING_M;
      // Se apagan antes de que el patrón sea más fino que un píxel y parpadee.
      float detail = 1.0 - smoothstep(0.7, 1.8, fwidth(phase));
      float inside = smoothstep(1.0, 0.8, across);
      float lip = smoothstep(0.7, 0.9, across) * (1.0 - smoothstep(0.9, 1.0, across));
      float shade = 1.0 - 0.2 * inside + 0.09 * sin(phase) * detail * inside + 0.07 * lip;
      float strength = vTrack.z * (1.0 - smoothstep(90.0, 240.0, vViewDistance));
      gl_FragColor = vec4(vec3(mix(1.0, shade, strength)), 1.0);
    }
  `,
});

export function createTracks(terrain, grid) {
  const recorder = createTrackRecorder({ wheelCount: WHEEL_COUNT, capacity: SAMPLES_PER_WHEEL, step_m: STEP_M });
  const vertexCount = WHEEL_COUNT * SAMPLES_PER_WHEEL * VERTICES_PER_SAMPLE;
  const positions = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const tracks = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage);
  // Todos los índices en cero: triángulos vacíos hasta que exista el tramo.
  const indices = new THREE.BufferAttribute(new Uint32Array(WHEEL_COUNT * SAMPLES_PER_WHEEL * INDICES_PER_SEGMENT), 1).setUsage(THREE.DynamicDrawUsage);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  geometry.setAttribute('aTrack', tracks);
  geometry.setIndex(indices);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  const firstVertex = (wheelIndex, sampleIndex) => (wheelIndex * SAMPLES_PER_WHEEL + sampleIndex) * VERTICES_PER_SAMPLE;
  const firstIndex = (wheelIndex, sampleIndex) => (wheelIndex * SAMPLES_PER_WHEEL + sampleIndex) * INDICES_PER_SEGMENT;

  function clearSegment(wheelIndex, sampleIndex) {
    const start = firstIndex(wheelIndex, sampleIndex);
    indices.array.fill(0, start, start + INDICES_PER_SEGMENT);
    indices.addUpdateRange(start, INDICES_PER_SEGMENT);
  }

  function writeSample(sample) {
    const { wheelIndex, index, previousIndex, x_m, z_m, crossX, crossZ, distance_m } = sample;
    // Sobre grava apenas se marca.
    const strength = 1 - 0.75 * Math.min(1, Math.max(0, terrain.rockinessAt(x_m, z_m)));
    const vertex = firstVertex(wheelIndex, index);
    for (let side = 0; side < VERTICES_PER_SAMPLE; side++) {
      const across = side - 1;
      const x = x_m + crossX * across * HALF_WIDTH_M;
      const z = z_m + crossZ * across * HALF_WIDTH_M;
      positions.setXYZ(vertex + side, x, grid.heightAt_m(x, z) + LIFT_M, z);
      tracks.setXYZ(vertex + side, across, distance_m, strength);
    }
    positions.addUpdateRange(vertex * 3, VERTICES_PER_SAMPLE * 3);
    tracks.addUpdateRange(vertex * 3, VERTICES_PER_SAMPLE * 3);
    positions.needsUpdate = true;
    tracks.needsUpdate = true;

    // El tramo siguiente unía esta muestra, ya reescrita, con la más antigua.
    clearSegment(wheelIndex, (index + 1) % SAMPLES_PER_WHEEL);
    if (previousIndex === null) clearSegment(wheelIndex, index);
    else writeSegment(wheelIndex, previousIndex, index);
    indices.needsUpdate = true;
  }

  function writeSegment(wheelIndex, fromSample, toSample) {
    const a = firstVertex(wheelIndex, fromSample);
    const b = firstVertex(wheelIndex, toSample);
    const start = firstIndex(wheelIndex, toSample);
    const array = indices.array;
    for (let column = 0; column < 2; column++) {
      const offset = start + column * 6;
      array[offset] = a + column;
      array[offset + 1] = b + column;
      array[offset + 2] = a + column + 1;
      array[offset + 3] = b + column;
      array[offset + 4] = b + column + 1;
      array[offset + 5] = a + column + 1;
    }
    indices.addUpdateRange(start, INDICES_PER_SEGMENT);
  }

  return {
    mesh,
    record({ x_m, z_m, heading_rad }) {
      ROVER_SPEC.wheels.forEach((wheel, wheelIndex) => {
        const ground = wheelGroundPosition(wheel, x_m, z_m, heading_rad);
        for (const sample of recorder.record(wheelIndex, ground.x_m, ground.z_m)) writeSample(sample);
      });
    },
  };
}
