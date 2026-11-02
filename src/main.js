import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain } from './domain/terrain-height.js';
import { parseFrozenTime_s } from './frozen-time.js';
import { createDust } from './scene/dust.js';
import { createLighting } from './scene/lighting.js';
import { HORIZON_COLOR } from './scene/look.js';
import { createMoons } from './scene/moons.js';
import { createPost } from './scene/post.js';
import { createRocks } from './scene/rocks.js';
import { createSky } from './scene/sky.js';
import { createTerrainMesh } from './scene/terrain.js';

const CAMERA_EYE_HEIGHT_M = 5;
const CAMERA_MIN_CLEARANCE_M = 1.5;
const CAMERA_START = { x: 0, z: 60 };
const VIEW_PITCH = Math.tan(THREE.MathUtils.degToRad(6.5));
const TARGET_DISTANCE_M = 90;
const READY_AFTER_FRAMES = 5;

const terrain = createTerrain();
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
const startY = terrain.heightAt_m(CAMERA_START.x, CAMERA_START.z) + CAMERA_EYE_HEIGHT_M;
camera.position.set(CAMERA_START.x, startY, CAMERA_START.z);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(CAMERA_START.x, startY + TARGET_DISTANCE_M * VIEW_PITCH, CAMERA_START.z - TARGET_DISTANCE_M);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 20;
controls.maxDistance = 320;
controls.maxPolarAngle = THREE.MathUtils.degToRad(100);
controls.update();

const sky = createSky();
const moons = createMoons();
const dust = createDust();
const { group: lights, shadows } = createLighting(camera);
const rocks = createRocks(terrain, shadows);
scene.add(sky.mesh, moons.group, dust.points, lights, createTerrainMesh(terrain, shadows, rocks.placements), rocks.group);

const post = createPost(renderer, scene, camera);

const frozenTime_s = parseFrozenTime_s(location.search);

// Paneo lento hasta que el usuario toma el control de la vista.
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let driftEnabled = !prefersReducedMotion && frozenTime_s === null;
controls.addEventListener('start', () => {
  driftEnabled = false;
});
const basePosition = camera.position.clone();
const baseTarget = controls.target.clone();

function applyDrift(time_s) {
  const sway = Math.sin(time_s * 0.05);
  camera.position.copy(basePosition);
  camera.position.x += sway * 7;
  camera.position.y += Math.sin(time_s * 0.031) * 0.6;
  controls.target.copy(baseTarget);
  controls.target.x += sway * 2.5;
}

function keepCameraAboveGround() {
  const minY = terrain.heightAt_m(camera.position.x, camera.position.z) + CAMERA_MIN_CLEARANCE_M;
  if (camera.position.y < minY) camera.position.y = minY;
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  shadows.refit();
  renderer.setSize(innerWidth, innerHeight);
  post.setSize(innerWidth, innerHeight);
});

let frames = 0;
renderer.setAnimationLoop((now_ms) => {
  const time_s = frozenTime_s ?? now_ms / 1000;
  if (driftEnabled) applyDrift(time_s);
  controls.update();
  keepCameraAboveGround();
  shadows.update();
  sky.update(time_s, camera);
  moons.update(camera);
  dust.update(time_s);
  post.render(time_s);
  if (++frames === READY_AFTER_FRAMES) window.__marsReady = true;
});
