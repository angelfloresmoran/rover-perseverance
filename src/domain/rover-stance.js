// Cómo se apoya el rover: ajusta un plano a la altura bajo sus seis ruedas.
// Modelo aproximado: el cuerpo se inclina como un conjunto, sin articular el rocker-bogie.
// Sin dependencias gráficas. Unidades: metros.
import { ROVER_SPEC } from './rover-spec.js';

const MAX_WHEEL_TRAVEL_M = 0.12;

// La suma de `left_m`, `forward_m` y sus productos es fija: se prepara una vez la inversa de las ecuaciones normales.
function createPlaneSolver(wheels) {
  let sumL = 0;
  let sumF = 0;
  let sumLL = 0;
  let sumLF = 0;
  let sumFF = 0;
  for (const { left_m: l, forward_m: f } of wheels) {
    sumL += l;
    sumF += f;
    sumLL += l * l;
    sumLF += l * f;
    sumFF += f * f;
  }
  const n = wheels.length;
  const c00 = sumLL * sumFF - sumLF * sumLF;
  const c01 = sumF * sumLF - sumL * sumFF;
  const c02 = sumL * sumLF - sumF * sumLL;
  const determinant = n * c00 + sumL * c01 + sumF * c02;
  const c11 = n * sumFF - sumF * sumF;
  const c12 = sumL * sumF - n * sumLF;
  const c22 = n * sumLL - sumL * sumL;
  return (sumY, sumYL, sumYF) => ({
    height_m: (c00 * sumY + c01 * sumYL + c02 * sumYF) / determinant,
    slopeLeft: (c01 * sumY + c11 * sumYL + c12 * sumYF) / determinant,
    slopeForward: (c02 * sumY + c12 * sumYL + c22 * sumYF) / determinant,
  });
}

const solvePlane = createPlaneSolver(ROVER_SPEC.wheels);

const normalize = ([x, y, z]) => {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};
const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];

export const headingForward = (heading_rad) => [Math.sin(heading_rad), Math.cos(heading_rad)];
export const headingLeft = (heading_rad) => [Math.cos(heading_rad), -Math.sin(heading_rad)];

export function wheelGroundPosition(wheel, x_m, z_m, heading_rad) {
  const [fx, fz] = headingForward(heading_rad);
  const [lx, lz] = headingLeft(heading_rad);
  return {
    x_m: x_m + wheel.left_m * lx + wheel.forward_m * fx,
    z_m: z_m + wheel.left_m * lz + wheel.forward_m * fz,
  };
}

export function computeStance({ x_m, z_m, heading_rad }, heightAt_m) {
  const contacts_m = [];
  let sumY = 0;
  let sumYL = 0;
  let sumYF = 0;
  for (const wheel of ROVER_SPEC.wheels) {
    const ground = wheelGroundPosition(wheel, x_m, z_m, heading_rad);
    const y_m = heightAt_m(ground.x_m, ground.z_m);
    contacts_m.push(y_m);
    sumY += y_m;
    sumYL += y_m * wheel.left_m;
    sumYF += y_m * wheel.forward_m;
  }
  const { height_m, slopeLeft, slopeForward } = solvePlane(sumY, sumYL, sumYF);

  const [fx, fz] = headingForward(heading_rad);
  const [lx, lz] = headingLeft(heading_rad);
  const forward = normalize([fx, slopeForward, fz]);
  const up = normalize(cross(forward, [lx, slopeLeft, lz]));
  const left = cross(up, forward);

  // Lo que el plano no explica lo absorbe cada rueda, hasta el recorrido que aparenta la suspensión.
  const wheelLift_m = [];
  const wheelGap_m = [];
  ROVER_SPEC.wheels.forEach((wheel, index) => {
    const planeHeight_m = height_m + slopeLeft * wheel.left_m + slopeForward * wheel.forward_m;
    const wanted_m = contacts_m[index] - planeHeight_m;
    const lift_m = Math.min(MAX_WHEEL_TRAVEL_M, Math.max(-MAX_WHEEL_TRAVEL_M, wanted_m));
    wheelLift_m.push(lift_m);
    wheelGap_m.push(Math.abs(wanted_m - lift_m));
  });

  return {
    origin: [x_m, height_m, z_m],
    left,
    up,
    forward,
    tilt_deg: (Math.acos(Math.min(1, up[1])) * 180) / Math.PI,
    wheelLift_m,
    wheelGap_m,
  };
}
