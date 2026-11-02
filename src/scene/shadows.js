import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { SUN_COLOR, SUN_DIRECTION } from './look.js';

const SUN_INTENSITY = 4.6;
const SHADOW_DISTANCE_M = 2200;
const SHADOW_MAP_SIZE = 2048;
const LIGHT_MARGIN_M = 2500;
const LIGHT_FAR_M = 6000;

// Cerca nítida, lejos suave: el difuminado se mide en texeles y cada cascada tiene texeles más grandes.
// El bias está normalizado sobre LIGHT_FAR_M: -0.00003 equivale a unos 18 cm.
const CASCADES = [
  { end_m: 70, radius: 1.5, bias: -0.00003, normalBias_m: 0.03 },
  { end_m: 380, radius: 1.5, bias: -0.00006, normalBias_m: 0.1 },
  { end_m: SHADOW_DISTANCE_M, radius: 2, bias: -0.0002, normalBias_m: 0.5 },
];

// Cada mapa se agranda esta fracción por lado. Mientras la cámara se mueva menos que eso, el mapa sigue
// siendo válido: el sol y el terreno no cambian, y no hace falta volver a calcularlo en cada cuadro.
const COVERAGE_SLACK = 0.1;

// El polvo dispersa la luz hacia adelante y forma una aureola alrededor del sol que un obstáculo no tapa
// del todo. Aproximación: la sombra bloquea esta fracción de la luz directa, no toda.
const SHADOW_STRENGTH = 0.76;

function splitAtCascadeEnds(_count, _near, far, target) {
  for (const { end_m } of CASCADES) target.push(Math.min(end_m / far, 1));
}

export function createShadows(camera, parent) {
  const csm = new CSM({
    camera,
    parent,
    cascades: CASCADES.length,
    maxFar: SHADOW_DISTANCE_M,
    mode: 'custom',
    customSplitsCallback: splitAtCascadeEnds,
    shadowMapSize: SHADOW_MAP_SIZE,
    lightDirection: SUN_DIRECTION.clone().negate(),
    lightIntensity: SUN_INTENSITY,
    lightFar: LIGHT_FAR_M,
    lightMargin: LIGHT_MARGIN_M,
  });
  csm.fade = true;

  const lastRendered = csm.lights.map(() => null);
  const moveLimits_m = csm.lights.map(() => 0);

  csm.lights.forEach((light, index) => {
    const { radius, bias, normalBias_m } = CASCADES[index];
    light.color.copy(SUN_COLOR);
    light.shadow.intensity = SHADOW_STRENGTH;
    light.shadow.radius = radius;
    light.shadow.bias = bias;
    light.shadow.normalBias = normalBias_m;
    light.shadow.autoUpdate = false;
  });

  function fitCoverage() {
    csm.updateFrustums();
    csm.lights.forEach((light, index) => {
      const shadowCamera = light.shadow.camera;
      const fittedWidth_m = shadowCamera.right - shadowCamera.left;
      const slack_m = fittedWidth_m * COVERAGE_SLACK;
      shadowCamera.left -= slack_m;
      shadowCamera.right += slack_m;
      shadowCamera.top += slack_m;
      shadowCamera.bottom -= slack_m;
      shadowCamera.updateProjectionMatrix();
      moveLimits_m[index] = slack_m;
      lastRendered[index] = null;
    });
  }
  fitCoverage();

  return {
    // Une el parche de CSM con el propio del material. Three.js distingue programas por el texto de
    // `onBeforeCompile`, así que hace falta una clave propia o dos materiales compartirían shader.
    attach(material, cacheKey) {
      const ownPatch = material.onBeforeCompile;
      csm.setupMaterial(material);
      const csmPatch = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        csmPatch(shader);
        ownPatch(shader, renderer);
      };
      material.customProgramCacheKey = () => cacheKey;
    },
    update() {
      camera.updateMatrixWorld();
      csm.update();
      csm.lights.forEach((light, index) => {
        const previous = lastRendered[index];
        if (previous !== null && previous.distanceTo(light.position) <= moveLimits_m[index]) return;
        light.shadow.needsUpdate = true;
        lastRendered[index] = light.position.clone();
      });
    },
    // Llamar cuando cambia la proyección de la cámara.
    refit: fitCoverage,
  };
}
