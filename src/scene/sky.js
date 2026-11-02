import * as THREE from 'three';
import { GLSL_NOISE } from './glsl-noise.js';
import { HORIZON_COLOR, SUN_DIRECTION } from './look.js';

// Radio angular del sol agrandado respecto al real, por composición.
const SUN_ANGULAR_RADIUS_DEG = 1.15;

export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime_s: { value: 0 },
      uSunDir: { value: SUN_DIRECTION },
      uHorizon: { value: HORIZON_COLOR },
      uSunCos: { value: Math.cos(THREE.MathUtils.degToRad(SUN_ANGULAR_RADIUS_DEG)) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime_s;
      uniform vec3 uSunDir;
      uniform vec3 uHorizon;
      uniform float uSunCos;
      varying vec3 vDirection;
      ${GLSL_NOISE}
      void main() {
        vec3 dir = normalize(vDirection);
        float up = max(dir.y, 0.0);

        // Degradado caramelo: horizonte claro, cenit más tostado.
        vec3 caramel = vec3(0.50, 0.205, 0.066);
        vec3 zenith = vec3(0.17, 0.066, 0.024);
        vec3 color = mix(uHorizon, caramel, smoothstep(0.0, 0.26, up));
        color = mix(color, zenith, smoothstep(0.2, 0.95, up));

        // Velos de polvo en altura, estirados por el viento.
        vec2 veilUv = dir.xz / (up + 0.2);
        float drift = uTime_s * 0.006;
        float veil = fbm2(veilUv * vec2(1.1, 2.8) + vec2(drift, drift * 0.4));
        float fineVeil = fbm2(veilUv * vec2(3.4, 8.5) - vec2(drift * 1.7, 0.0));
        float dustAmount = smoothstep(0.34, 0.78, veil * 0.72 + fineVeil * 0.28);
        color = mix(color, color * vec3(1.62, 1.42, 1.2) + vec3(0.035, 0.012, 0.0), dustAmount * 0.8);
        color *= 1.0 - 0.24 * smoothstep(0.48, 0.24, veil);

        // Banda densa de polvo sobre el horizonte.
        float band = exp(-up * 15.0) * (0.72 + 0.5 * fbm2(vec2(atan(dir.x, -dir.z) * 7.0 + drift, up * 26.0)));
        color = mix(color, uHorizon * 1.08, clamp(band, 0.0, 1.0));

        // Sol: disco, corona y dispersión amplia en el polvo.
        float sunCos = dot(dir, uSunDir);
        float toSun = max(sunCos, 0.0);
        color += vec3(1.0, 0.46, 0.17) * pow(toSun, 10.0) * 0.2;
        color += vec3(1.0, 0.54, 0.22) * pow(toSun, 90.0) * 0.32;
        color += vec3(1.0, 0.66, 0.36) * pow(toSun, 1400.0) * 0.8;
        float disc = smoothstep(uSunCos - 0.00012, uSunCos + 0.00012, sunCos);
        color = mix(color, vec3(5.2, 3.9, 2.4), disc);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return {
    mesh,
    update(time_s, camera) {
      material.uniforms.uTime_s.value = time_s;
      mesh.position.copy(camera.position);
    },
  };
}
