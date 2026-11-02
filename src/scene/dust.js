import * as THREE from 'three';
import { SUN_DIRECTION } from './look.js';

const COUNT = 2600;
const BOX_SIZE_M = 90;

// Polvo en suspensión que acompaña a la cámara; las partículas reaparecen al salir de la caja.
export function createDust(seed = 5) {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  const offsets = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    offsets.set([random() * BOX_SIZE_M, random() * BOX_SIZE_M, random() * BOX_SIZE_M], i * 3);
    sizes[i] = 0.5 + random() ** 3 * 2.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(offsets, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime_s: { value: 0 },
      uBoxSize: { value: BOX_SIZE_M },
      uSunDir: { value: SUN_DIRECTION },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uTime_s;
      uniform float uBoxSize;
      uniform vec3 uSunDir;
      varying float vGlow;
      void main() {
        vec3 wind = vec3(1.5, 0.05, 0.7) * uTime_s;
        vec3 flutter = vec3(sin(uTime_s * 0.3 + position.y), sin(uTime_s * 0.4 + position.x) * 0.6, cos(uTime_s * 0.25 + position.z));
        vec3 local = position + wind + flutter - cameraPosition;
        local = mod(local, uBoxSize) - uBoxSize * 0.5;
        vec4 mvPosition = viewMatrix * vec4(cameraPosition + local, 1.0);
        float dist = -mvPosition.z;
        float fade = smoothstep(uBoxSize * 0.5, uBoxSize * 0.25, length(local)) * smoothstep(1.0, 5.0, dist);
        float toSun = max(dot(normalize(local), uSunDir), 0.0);
        vGlow = fade * (0.09 + 0.34 * pow(toSun, 5.0));
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * 70.0 / max(dist, 1.0), 1.0, 14.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      void main() {
        float falloff = 1.0 - length(gl_PointCoord - 0.5) * 2.0;
        if (falloff <= 0.0) discard;
        gl_FragColor = vec4(vec3(1.0, 0.68, 0.42) * vGlow * falloff * falloff, 1.0);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(time_s) {
      material.uniforms.uTime_s.value = time_s;
    },
  };
}
