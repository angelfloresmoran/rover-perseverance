// Avanza la simulación del rover a paso fijo, independiente de los FPS, e interpola para dibujar.
import { createRoverState, stepRover } from '../domain/rover-kinematics.js';

export const ROVER_START = Object.freeze({ x_m: 0, z_m: 46, heading_rad: Math.PI });

const FIXED_STEP_S = 1 / 60;
const MAX_FRAME_S = 0.1; // Tras una pestaña en pausa, no se simula de golpe el tiempo perdido.
const ACCUMULATOR_EPSILON_S = 1e-9;

const lerp = (a, b, t) => a + (b - a) * t;

export function createRoverController({ world, start = ROVER_START, onStep = () => {} }) {
  let current = createRoverState(start);
  let previous = current;
  let accumulator_s = 0;

  return {
    get state() {
      return current;
    },
    advance(frame_s, input) {
      accumulator_s += Math.min(MAX_FRAME_S, frame_s);
      while (accumulator_s + ACCUMULATOR_EPSILON_S >= FIXED_STEP_S) {
        previous = current;
        current = stepRover(current, input, FIXED_STEP_S, world);
        onStep(current);
        accumulator_s -= FIXED_STEP_S;
      }
      const t = Math.max(0, accumulator_s) / FIXED_STEP_S;
      return {
        ...current,
        x_m: lerp(previous.x_m, current.x_m, t),
        z_m: lerp(previous.z_m, current.z_m, t),
        heading_rad: lerp(previous.heading_rad, current.heading_rad, t),
        steer: lerp(previous.steer, current.steer, t),
        leftSpin_rad: lerp(previous.leftSpin_rad, current.leftSpin_rad, t),
        rightSpin_rad: lerp(previous.rightSpin_rad, current.rightSpin_rad, t),
      };
    },
  };
}
