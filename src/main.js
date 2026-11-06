import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createKeyboard } from './app/keyboard.js';
import { createRoverController, ROVER_START } from './app/rover-controller.js';
import { createRoverWorld } from './domain/rover-kinematics.js';
import { DRIVE_TIME_SCALE } from './domain/rover-spec.js';
import { computeStance } from './domain/rover-stance.js';
import { createTerrainGrid } from './domain/terrain-grid.js';
import { createTerrain } from './domain/terrain-height.js';
import { parseFrozenTime_s } from './frozen-time.js';
import { createChaseCamera, MAX_DISTANCE_M, MIN_DISTANCE_M } from './scene/chase-camera.js';
import { createDust } from './scene/dust.js';
import { createLighting } from './scene/lighting.js';
import { HORIZON_COLOR } from './scene/look.js';
import { createMoons } from './scene/moons.js';
import { createPost } from './scene/post.js';
import { createRocks } from './scene/rocks.js';
import { loadRover } from './scene/rover.js';
import { createSky } from './scene/sky.js';
import { createTerrainMesh } from './scene/terrain.js';
import { createTracks } from './scene/tracks.js';

const CAMERA_MIN_CLEARANCE_M = 1.2;
const READY_AFTER_FRAMES = 5;

const terrain = createTerrain();
const grid = createTerrainGrid(terrain);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(HORIZON_COLOR, 0.00028);

const renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 16000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = MIN_DISTANCE_M;
controls.maxDistance = MAX_DISTANCE_M;
controls.maxPolarAngle = THREE.MathUtils.degToRad(100);

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const chase = createChaseCamera({ camera, controls, allowRealign: !prefersReducedMotion });
chase.place(computeStance(ROVER_START, grid.heightAt_m), ROVER_START.heading_rad);

function keepCameraAboveGround() {
  const minY = grid.heightAt_m(camera.position.x, camera.position.z) + CAMERA_MIN_CLEARANCE_M;
  if (camera.position.y < minY) camera.position.y = minY;
}
keepCameraAboveGround();
controls.update();

const sky = createSky();
const moons = createMoons();
const dust = createDust();
const { group: lights, shadows } = createLighting(camera);
const rocks = createRocks(terrain, shadows);
const tracks = createTracks(terrain, grid);
scene.add(sky.mesh, moons.group, dust.points, lights, createTerrainMesh(terrain, grid, shadows, rocks.placements), rocks.group, tracks.mesh);

const post = createPost(renderer, scene, camera);

const frozenTime_s = parseFrozenTime_s(location.search);
const keyboard = createKeyboard();
const controller = createRoverController({
  world: createRoverWorld({ heightAt_m: grid.heightAt_m, rocks: rocks.placements }),
  onStep: (state) => tracks.record(state),
});

document.getElementById('drive-speed').textContent = `×${DRIVE_TIME_SCALE}`;

let rover = null;
let roverSettled = false;
loadRover(renderer, shadows)
  .then((loaded) => {
    rover = loaded;
    rover.setPose(controller.state, computeStance(controller.state, grid.heightAt_m));
    scene.add(rover.group);
    shadows.invalidate();
  })
  .catch((error) => {
    console.error('[Perseverance] No se pudo cargar el modelo', error);
    document.getElementById('rover-status').hidden = false;
  })
  .finally(() => {
    roverSettled = true;
  });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  shadows.refit();
  renderer.setSize(innerWidth, innerHeight);
  post.setSize(innerWidth, innerHeight);
});

function driveRover(frame_s) {
  const previous = controller.state;
  const pose = controller.advance(frame_s, keyboard.input);
  const stance = computeStance(pose, grid.heightAt_m);
  rover.setPose(pose, stance);
  chase.update(stance, pose, frame_s);
  const current = controller.state;
  return current.x_m !== previous.x_m || current.z_m !== previous.z_m || current.heading_rad !== previous.heading_rad;
}

let frames = 0;
let previousNow_ms = null;
renderer.setAnimationLoop((now_ms) => {
  const time_s = frozenTime_s ?? now_ms / 1000;
  const frame_s = previousNow_ms === null ? 0 : (now_ms - previousNow_ms) / 1000;
  previousNow_ms = now_ms;

  const roverMoved = rover !== null && frozenTime_s === null ? driveRover(frame_s) : false;
  controls.update();
  keepCameraAboveGround();
  shadows.update({ nearObjectMoved: roverMoved });
  sky.update(time_s, camera);
  moons.update(camera);
  dust.update(time_s);
  post.render(time_s);
  if (roverSettled && ++frames === READY_AFTER_FRAMES) {
    window.__marsReady = true;
  }
});
