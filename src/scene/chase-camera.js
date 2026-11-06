import * as THREE from 'three';

// El punto al que mira queda sobre el rover para que este vaya en el tercio inferior y se vea el cielo.
const FOCUS_HEIGHT_M = 2.6;
const START_DISTANCE_M = 13;
const START_CAMERA_HEIGHT_M = 2.0;
export const MIN_DISTANCE_M = 8;
export const MAX_DISTANCE_M = 60;

const FOLLOW_RATE_PER_S = 5;
const REALIGN_RATE_PER_S = 0.9;
const REALIGN_AFTER_ORBIT_S = 2.5;
const REALIGN_MIN_SPEED_M_S = 0.1;

const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
// Suavizado exponencial: el resultado no depende de los FPS.
const smoothing = (rate_per_s, dt_s) => 1 - Math.exp(-rate_per_s * dt_s);

export function createChaseCamera({ camera, controls, allowRealign }) {
  const delta = new THREE.Vector3();
  let sinceOrbit_s = Infinity;

  controls.addEventListener('start', () => {
    sinceOrbit_s = 0;
  });

  return {
    // Coloca la cámara detrás del rover, sin suavizado.
    place(stance, heading_rad) {
      const [x, y, z] = stance.origin;
      controls.target.set(x, y + FOCUS_HEIGHT_M, z);
      camera.position.set(
        x - Math.sin(heading_rad) * START_DISTANCE_M,
        y + START_CAMERA_HEIGHT_M,
        z - Math.cos(heading_rad) * START_DISTANCE_M,
      );
    },
    update(stance, pose, dt_s) {
      sinceOrbit_s += dt_s;
      const [x, y, z] = stance.origin;
      delta.set(x, y + FOCUS_HEIGHT_M, z).sub(controls.target).multiplyScalar(smoothing(FOLLOW_RATE_PER_S, dt_s));
      controls.target.add(delta);
      camera.position.add(delta);

      const driving = Math.abs(pose.speed_m_s) > REALIGN_MIN_SPEED_M_S;
      if (!allowRealign || !driving || sinceOrbit_s < REALIGN_AFTER_ORBIT_S) return;
      const offsetX = camera.position.x - controls.target.x;
      const offsetZ = camera.position.z - controls.target.z;
      const behind = pose.heading_rad + Math.PI;
      const turn = wrapAngle(behind - Math.atan2(offsetX, offsetZ)) * smoothing(REALIGN_RATE_PER_S, dt_s);
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      camera.position.x = controls.target.x + offsetX * cos + offsetZ * sin;
      camera.position.z = controls.target.z - offsetX * sin + offsetZ * cos;
    },
  };
}
