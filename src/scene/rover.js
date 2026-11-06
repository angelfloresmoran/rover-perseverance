import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROVER_SPEC } from '../domain/rover-spec.js';
import { HORIZON_COLOR, SUN_DIRECTION } from './look.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/mars-2020-perseverance.glb`;
const DECODER_PATH = `${import.meta.env.BASE_URL}draco/`;

// Instante de las animaciones del modelo con el mástil desplegado y el brazo aún guardado.
const DEPLOYED_POSE_S = 3;
const MAX_VISIBLE_STEER_RAD = 0.35;

// Piezas con cámara, por nombre en el modelo. Es una lista y no un filtro por texto: "cam" dejaría fuera a WATSON
// y confundiría tapas con cámaras. Las marcadas por confirmar se deducen del nombre y la posición.
const CAMERA_PARTS = [
  { name: 'Mastcam_Z_cams', camera: 'Mastcam-Z' },
  { name: 'NavCams', camera: 'Navcams' },
  { name: 'hazcams_front', camera: 'Hazcams delanteras' },
  { name: 'hazcams_rear', camera: 'Hazcams traseras' },
  { name: 'WATSON', camera: 'WATSON, en la torreta del brazo' },
  { name: 'Up_Look_Camera', camera: 'Cámara de descenso, por confirmar' },
  { name: 'Down_Look_Camera', camera: 'Cámara de descenso, por confirmar' },
  { name: 'lens', camera: 'Lente del mástil, posiblemente SuperCam, por confirmar' },
];
const CAMERA_ACCESSORIES = ['hazcams_front_cover', 'hazcams_rear_cover_l', 'hazcams_rear_cover_r', 'hazcams_rear_wiring'];

function loadModel() {
  const draco = new DRACOLoader().setDecoderPath(DECODER_PATH);
  return new GLTFLoader()
    .setDRACOLoader(draco)
    .loadAsync(MODEL_URL)
    .finally(() => draco.dispose());
}

// Deja el mástil desplegado. El mezclador no se vuelve a actualizar: la pose es fija y no cuesta nada por cuadro.
function applyDeployedPose(model, animations) {
  const mixer = new THREE.AnimationMixer(model);
  for (const clip of animations) {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();
  }
  mixer.setTime(DEPLOYED_POSE_S);
}

function nearestWheelIndex(x_m, z_m) {
  let nearest = 0;
  let nearestDistance = Infinity;
  ROVER_SPEC.wheels.forEach((wheel, index) => {
    const distance = Math.hypot(x_m - wheel.left_m, z_m - wheel.forward_m);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

function extractTriangles(source, triangles) {
  const remap = new Map();
  const indices = [];
  for (const vertex of triangles) {
    if (!remap.has(vertex)) remap.set(vertex, remap.size);
    indices.push(remap.get(vertex));
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const { itemSize, array, normalized } = attribute;
    const values = new array.constructor(remap.size * itemSize);
    for (const [from, to] of remap) {
      for (let c = 0; c < itemSize; c++) values[to * itemSize + c] = array[from * itemSize + c];
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, itemSize, normalized));
  }
  geometry.setIndex(indices);
  return geometry;
}

// El modelo trae las seis ruedas en una sola malla. Se separan por cercanía a cada eje para que puedan girar.
function splitWheels(model, group) {
  const wheelsNode = model.getObjectByName('Wheels_objs');
  if (!wheelsNode) throw new Error('El modelo no tiene la pieza Wheels_objs');
  const meshes = [];
  wheelsNode.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });

  const pivots = ROVER_SPEC.wheels.map((wheel) => {
    const steering = new THREE.Group();
    steering.position.set(wheel.left_m, ROVER_SPEC.axleHeight_m, wheel.forward_m);
    const spinning = new THREE.Group();
    steering.add(spinning);
    group.add(steering);
    return { wheel, steering, spinning };
  });

  model.updateMatrixWorld(true);
  for (const mesh of meshes) {
    const baked = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const position = baked.attributes.position;
    const index = baked.index;
    const perWheel = ROVER_SPEC.wheels.map(() => []);
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const x_m = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
      const z_m = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
      perWheel[nearestWheelIndex(x_m, z_m)].push(a, b, c);
    }
    perWheel.forEach((triangles, wheelIndex) => {
      const { wheel, spinning } = pivots[wheelIndex];
      const geometry = extractTriangles(baked, triangles);
      geometry.translate(-wheel.left_m, -ROVER_SPEC.axleHeight_m, -wheel.forward_m);
      spinning.add(new THREE.Mesh(geometry, mesh.material));
    });
    baked.dispose();
    mesh.geometry.dispose();
  }
  wheelsNode.removeFromParent();
  return pivots;
}

// Reflejos para los metales: cielo y arena. Se asigna material por material para no alterar terreno ni rocas.
function createMetalEnvironment(renderer) {
  const scene = new THREE.Scene();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uHorizon: { value: HORIZON_COLOR }, uSunDir: { value: SUN_DIRECTION } },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        varying vec3 vDirection;
        void main() {
          vec3 dir = normalize(vDirection);
          vec3 sky = mix(uHorizon, vec3(0.34, 0.14, 0.05), smoothstep(0.0, 0.7, dir.y));
          vec3 ground = mix(uHorizon * 0.55, vec3(0.30, 0.13, 0.06), smoothstep(0.0, -0.5, dir.y));
          vec3 color = dir.y > 0.0 ? sky : ground;
          color += vec3(1.0, 0.62, 0.34) * pow(max(dot(dir, uSunDir), 0.0), 60.0) * 6.0;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  );
  scene.add(sphere);
  const generator = new THREE.PMREMGenerator(renderer);
  const texture = generator.fromScene(scene, 0.02).texture;
  generator.dispose();
  sphere.geometry.dispose();
  sphere.material.dispose();
  return texture;
}

function prepareMaterials(group, renderer, shadows) {
  const environment = createMetalEnvironment(renderer);
  const seen = new Set();
  group.traverse((object) => {
    if (!object.isMesh) return;
    const material = object.material;
    const isGlass = material.transmission > 0;
    object.castShadow = !isGlass;
    object.receiveShadow = true;
    if (seen.has(material)) return;
    seen.add(material);
    if (isGlass) {
      // Con `transmission`, Three.js volvería a dibujar toda la escena en cada cuadro.
      material.transmission = 0;
      material.transparent = true;
      material.opacity = 0.3;
      material.depthWrite = false;
    }
    material.envMap = environment;
    // Sin esto, cada material recibiría el sol una vez por cascada.
    shadows.attach(material, 'rover');
  });
}

function reportCameraParts(model) {
  const parts = new Map();
  const lines = [];
  for (const { name, camera } of CAMERA_PARTS) {
    const object = model.getObjectByName(name);
    if (!object) {
      console.warn(`[Perseverance] No se encontró la pieza de cámara "${name}"`);
      continue;
    }
    parts.set(name, object);
    lines.push(`  ${name}: ${camera}`);
  }
  const accessories = CAMERA_ACCESSORIES.filter((name) => model.getObjectByName(name));
  console.log(`[Perseverance] Piezas que son cámaras:\n${lines.join('\n')}\n[Perseverance] Accesorios de cámara (tapas y cableado): ${accessories.join(', ')}`);
  return parts;
}

function measure(group) {
  group.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(group, true).getSize(new THREE.Vector3());
  return { width_m: size.x, height_m: size.y, length_m: size.z };
}

export async function loadRover(renderer, shadows) {
  const { scene: model, animations } = await loadModel();
  const group = new THREE.Group();
  group.name = 'Perseverance';
  group.add(model);

  applyDeployedPose(model, animations);
  const cameraParts = reportCameraParts(model);
  const pivots = splitWheels(model, group);
  prepareMaterials(group, renderer, shadows);

  const dimensions_m = measure(group);
  console.log(
    `[Perseverance] Tamaño en escena: ${dimensions_m.length_m.toFixed(2)} × ${dimensions_m.width_m.toFixed(2)} × ${dimensions_m.height_m.toFixed(2)} m (largo, ancho, alto)`,
  );

  const basis = new THREE.Matrix4();
  group.matrixAutoUpdate = false;

  return {
    group,
    cameraParts,
    dimensions_m,
    setPose(pose, stance) {
      const [lx, ly, lz] = stance.left;
      const [ux, uy, uz] = stance.up;
      const [fx, fy, fz] = stance.forward;
      const [ox, oy, oz] = stance.origin;
      basis.set(lx, ux, fx, ox, ly, uy, fy, oy, lz, uz, fz, oz, 0, 0, 0, 1);
      group.matrix.copy(basis);
      group.matrixWorldNeedsUpdate = true;
      pivots.forEach(({ wheel, steering, spinning }, index) => {
        steering.position.y = ROVER_SPEC.axleHeight_m + stance.wheelLift_m[index];
        steering.rotation.y = wheel.steers * pose.steer * MAX_VISIBLE_STEER_RAD;
        spinning.rotation.x = wheel.left_m > 0 ? pose.leftSpin_rad : pose.rightSpin_rad;
      });
    },
  };
}
