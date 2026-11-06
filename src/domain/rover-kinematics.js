// Conducción del rover: cinemática pura, sin dinámica. Función pura del estado, la entrada y el mundo.
// Rumbo: 0 mira a +Z y crece girando a la izquierda vista desde arriba. Sin dependencias gráficas. Unidades SI.
import { DRIVE_TUNING, ROVER_SPEC } from './rover-spec.js';
import { computeStance, headingForward, headingLeft } from './rover-stance.js';

const STOPPED_SPEED_M_S = 0.03;
const TRACK_HALF_WIDTH_M = ROVER_SPEC.wheels[0].left_m;
const OBSTACLE_CELL_M = 20;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const approach = (value, target, maxDelta) => (Math.abs(target - value) <= maxDelta ? target : value + Math.sign(target - value) * maxDelta);

export function createRoverState({ x_m, z_m, heading_rad }) {
  return { x_m, z_m, heading_rad, speed_m_s: 0, yawRate_rad_s: 0, steer: 0, leftSpin_rad: 0, rightSpin_rad: 0 };
}

const obstacleCellKey = (ix, iz) => ix * 100003 + iz;

function indexObstacles(rocks) {
  const cells = new Map();
  for (const rock of rocks) {
    if (rock.height_m <= ROVER_SPEC.maxObstacleHeight_m) continue;
    const reachCells = Math.ceil(rock.radius_m / OBSTACLE_CELL_M);
    const cx = Math.floor(rock.x_m / OBSTACLE_CELL_M);
    const cz = Math.floor(rock.z_m / OBSTACLE_CELL_M);
    for (let ix = cx - reachCells; ix <= cx + reachCells; ix++) {
      for (let iz = cz - reachCells; iz <= cz + reachCells; iz++) {
        const key = obstacleCellKey(ix, iz);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(rock);
      }
    }
  }
  return cells;
}

// Reúne el terreno y las rocas. Solo cuentan como obstáculo las que el rover no podría pasar por encima.
export function createRoverWorld({ heightAt_m, rocks = [] }) {
  const cells = indexObstacles(rocks);
  const { halfWidth_m, frontForward_m, rearForward_m } = ROVER_SPEC.footprint;
  const reachCells = 1;

  return {
    heightAt_m,
    // Cuánto se mete la caja del rover en la roca más cercana. 0 = libre.
    collisionDepth_m({ x_m, z_m, heading_rad }) {
      const [fx, fz] = headingForward(heading_rad);
      const [lx, lz] = headingLeft(heading_rad);
      const cx = Math.floor(x_m / OBSTACLE_CELL_M);
      const cz = Math.floor(z_m / OBSTACLE_CELL_M);
      let deepest = 0;
      for (let ix = cx - reachCells; ix <= cx + reachCells; ix++) {
        for (let iz = cz - reachCells; iz <= cz + reachCells; iz++) {
          for (const rock of cells.get(obstacleCellKey(ix, iz)) ?? []) {
            const dx = rock.x_m - x_m;
            const dz = rock.z_m - z_m;
            const left = dx * lx + dz * lz;
            const forward = dx * fx + dz * fz;
            const nearLeft = Math.min(halfWidth_m, Math.max(-halfWidth_m, left));
            const nearForward = Math.min(frontForward_m, Math.max(rearForward_m, forward));
            const depth = rock.radius_m - Math.hypot(left - nearLeft, forward - nearForward);
            if (depth > deepest) deepest = depth;
          }
        }
      }
      return deepest;
    },
  };
}

// Se permite el movimiento si cumple los límites o si, al menos, mejora una situación que ya los incumplía.
function canMove(current, candidate, world) {
  const outside = Math.hypot(candidate.x_m, candidate.z_m) > DRIVE_TUNING.driveAreaRadius_m;
  if (outside && Math.hypot(candidate.x_m, candidate.z_m) >= Math.hypot(current.x_m, current.z_m)) return false;

  const depth = world.collisionDepth_m(candidate);
  if (depth > 0 && depth >= world.collisionDepth_m(current)) return false;

  const tilt_deg = computeStance(candidate, world.heightAt_m).tilt_deg;
  if (tilt_deg > ROVER_SPEC.maxTilt_deg && tilt_deg >= computeStance(current, world.heightAt_m).tilt_deg) return false;
  return true;
}

function slopeSpeedFactor(tilt_deg) {
  const steepness = smoothstep(DRIVE_TUNING.slowdownStartTilt_deg, ROVER_SPEC.maxTilt_deg, tilt_deg);
  return 1 - steepness * (1 - DRIVE_TUNING.minSlopeSpeedFactor);
}

export function stepRover(state, { throttle, steer }, dt_s, world) {
  const nextSteer = approach(state.steer, steer, DRIVE_TUNING.steerResponse_per_s * dt_s);
  const tilt_deg = computeStance(state, world.heightAt_m).tilt_deg;
  const targetSpeed = throttle * ROVER_SPEC.topSpeed_m_s * slopeSpeedFactor(tilt_deg);
  const speed = approach(state.speed_m_s, targetSpeed, DRIVE_TUNING.acceleration_m_s2 * dt_s);

  const stopped = throttle === 0 && Math.abs(speed) < STOPPED_SPEED_M_S;
  const yaw = stopped ? nextSteer * DRIVE_TUNING.turnInPlaceRate_rad_s : (speed / DRIVE_TUNING.arcRadius_m) * nextSteer;

  const heading_rad = state.heading_rad + yaw * dt_s;
  const [fx, fz] = headingForward(heading_rad);
  const moved = { x_m: state.x_m + fx * speed * dt_s, z_m: state.z_m + fz * speed * dt_s, heading_rad };

  let pose = moved;
  let actualSpeed = speed;
  let actualYaw = yaw;
  if (!canMove(state, moved, world)) {
    actualSpeed = 0;
    const turned = { x_m: state.x_m, z_m: state.z_m, heading_rad };
    if (canMove(state, turned, world)) {
      pose = turned;
    } else {
      pose = { x_m: state.x_m, z_m: state.z_m, heading_rad: state.heading_rad };
      actualYaw = 0;
    }
  }

  // Cada lado rueda según su propia velocidad; al girar en el sitio, en sentidos opuestos.
  const leftSpeed = actualSpeed - actualYaw * TRACK_HALF_WIDTH_M;
  const rightSpeed = actualSpeed + actualYaw * TRACK_HALF_WIDTH_M;
  return {
    ...pose,
    speed_m_s: actualSpeed,
    yawRate_rad_s: actualYaw,
    steer: nextSteer,
    leftSpin_rad: state.leftSpin_rad + (leftSpeed / ROVER_SPEC.wheelRadius_m) * dt_s,
    rightSpin_rad: state.rightSpin_rad + (rightSpeed / ROVER_SPEC.wheelRadius_m) * dt_s,
  };
}
