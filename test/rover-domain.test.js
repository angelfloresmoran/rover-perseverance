import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoverController } from '../src/app/rover-controller.js';
import { createRoverState, createRoverWorld, stepRover } from '../src/domain/rover-kinematics.js';
import { DRIVE_TIME_SCALE, DRIVE_TUNING, ROVER_SPEC } from '../src/domain/rover-spec.js';
import { computeStance } from '../src/domain/rover-stance.js';

const DT = 1 / 60;
const FLAT = createRoverWorld({ heightAt_m: () => 5 });
const IDLE = { throttle: 0, steer: 0 };
const FORWARD = { throttle: 1, steer: 0 };

function drive(state, input, seconds, world = FLAT) {
  let current = state;
  for (let i = 0; i < Math.round(seconds * 60); i++) current = stepRover(current, input, DT, world);
  return current;
}
const start = (heading_rad = 0, x_m = 0, z_m = 0) => createRoverState({ x_m, z_m, heading_rad });

test('los datos del rover coinciden con la velocidad real multiplicada por el factor', () => {
  assert.ok(Math.abs(ROVER_SPEC.realTopSpeed_m_s - 0.0422) < 0.0001);
  assert.equal(ROVER_SPEC.topSpeed_m_s, ROVER_SPEC.realTopSpeed_m_s * DRIVE_TIME_SCALE);
});

test('avanza hacia donde mira y alcanza la velocidad máxima', () => {
  const state = drive(start(0), FORWARD, 3);
  assert.ok(state.z_m > 2, `z = ${state.z_m}`);
  assert.ok(Math.abs(state.x_m) < 1e-9);
  assert.ok(Math.abs(state.speed_m_s - ROVER_SPEC.topSpeed_m_s) < 1e-9);
});

test('retrocede y se detiene al soltar', () => {
  const backward = drive(start(0), { throttle: -1, steer: 0 }, 2);
  assert.ok(backward.z_m < -1);
  const stopped = drive(backward, IDLE, 2);
  assert.equal(stopped.speed_m_s, 0);
});

test('A gira a la izquierda: con rumbo -Z, la izquierda es -X', () => {
  const state = drive(start(Math.PI), { throttle: 1, steer: 1 }, 3);
  assert.ok(state.x_m < -0.5, `x = ${state.x_m}`);
  assert.ok(state.heading_rad > Math.PI);
});

test('D gira a la derecha, y en reversa el giro se invierte como en un auto', () => {
  const right = drive(start(Math.PI), { throttle: 1, steer: -1 }, 3);
  assert.ok(right.x_m > 0.5, `x = ${right.x_m}`);
  const reverse = drive(start(Math.PI), { throttle: -1, steer: 1 }, 3);
  assert.ok(reverse.heading_rad < Math.PI);
});

test('gira en el sitio sin desplazarse y con las ruedas en sentidos opuestos', () => {
  const state = drive(start(0, 3, 4), { throttle: 0, steer: 1 }, 2);
  assert.ok(Math.abs(state.x_m - 3) < 1e-9 && Math.abs(state.z_m - 4) < 1e-9);
  assert.ok(state.heading_rad > 0.3);
  assert.ok(state.leftSpin_rad < 0 && state.rightSpin_rad > 0);
});

test('las ruedas ruedan lo que corresponde a la distancia recorrida', () => {
  const state = drive(start(0), FORWARD, 4);
  assert.ok(Math.abs(state.leftSpin_rad - state.z_m / ROVER_SPEC.wheelRadius_m) < 1e-9);
  assert.equal(state.leftSpin_rad, state.rightSpin_rad);
});

test('la postura en suelo plano no tiene inclinación', () => {
  const stance = computeStance({ x_m: 2, z_m: 3, heading_rad: 1 }, () => 5);
  assert.ok(stance.tilt_deg < 1e-6);
  assert.ok(Math.abs(stance.origin[1] - 5) < 1e-9);
  assert.ok(stance.wheelLift_m.every((lift) => Math.abs(lift) < 1e-9));
});

test('la postura sigue una pendiente conocida y deja ejes ortonormales', () => {
  const slope = Math.tan((20 * Math.PI) / 180);
  const stance = computeStance({ x_m: 0, z_m: 0, heading_rad: 0.7 }, (x) => x * slope);
  assert.ok(Math.abs(stance.tilt_deg - 20) < 1e-6, `tilt = ${stance.tilt_deg}`);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (const axis of [stance.left, stance.up, stance.forward]) assert.ok(Math.abs(dot(axis, axis) - 1) < 1e-9);
  assert.ok(Math.abs(dot(stance.left, stance.up)) < 1e-9);
  assert.ok(Math.abs(dot(stance.up, stance.forward)) < 1e-9);
  assert.ok(Math.abs(dot(stance.left, stance.forward)) < 1e-9);
});

test('la rueda absorbe un bache hasta su recorrido y reporta lo que falta', () => {
  const small = computeStance({ x_m: 0, z_m: 0, heading_rad: 0 }, (x, z) => (x > 1 && z > 1 ? 0.05 : 0));
  assert.ok(small.wheelGap_m.every((gap) => gap < 1e-9));
  const large = computeStance({ x_m: 0, z_m: 0, heading_rad: 0 }, (x, z) => (x > 1 && z > 1 ? 2 : 0));
  assert.ok(Math.max(...large.wheelGap_m) > 0.1);
  assert.ok(large.wheelLift_m.every((lift) => Math.abs(lift) <= 0.12));
});

test('frena en la pendiente y no sube más allá del límite', () => {
  const ramp = createRoverWorld({ heightAt_m: (x, z) => Math.max(0, z - 5) * Math.tan((40 * Math.PI) / 180) });
  const state = drive(start(0), FORWARD, 30, ramp);
  assert.ok(state.z_m < 8, `z = ${state.z_m}`);
  assert.ok(computeStance(state, ramp.heightAt_m).tilt_deg <= ROVER_SPEC.maxTilt_deg + 1e-6);
  assert.equal(state.speed_m_s, 0);
  const away = drive(state, { throttle: -1, steer: 0 }, 2, ramp);
  assert.ok(away.z_m < state.z_m, 'puede retroceder');
});

test('reduce la velocidad en pendientes pronunciadas por debajo del límite', () => {
  const steep = createRoverWorld({ heightAt_m: (x) => x * Math.tan((25 * Math.PI) / 180) });
  const state = drive(start(0), FORWARD, 3, steep);
  assert.ok(state.speed_m_s < ROVER_SPEC.topSpeed_m_s * 0.8);
  assert.ok(state.speed_m_s >= ROVER_SPEC.topSpeed_m_s * DRIVE_TUNING.minSlopeSpeedFactor);
});

test('se detiene ante una roca grande y pasa sobre una pequeña', () => {
  const big = createRoverWorld({ heightAt_m: () => 0, rocks: [{ x_m: 0, z_m: 8, radius_m: 1, height_m: 0.8 }] });
  const blocked = drive(start(0), FORWARD, 10, big);
  assert.ok(blocked.z_m < 8 - 1 - ROVER_SPEC.footprint.frontForward_m + 0.05, `z = ${blocked.z_m}`);
  assert.equal(big.collisionDepth_m(blocked), 0);

  const small = createRoverWorld({ heightAt_m: () => 0, rocks: [{ x_m: 0, z_m: 8, radius_m: 0.3, height_m: 0.25 }] });
  assert.ok(drive(start(0), FORWARD, 10, small).z_m > 10);
});

test('encuentra rocas grandes que cruzan celdas de la indexación', () => {
  const rocks = [{ x_m: 19.5, z_m: 8, radius_m: 6, height_m: 4 }];
  const world = createRoverWorld({ heightAt_m: () => 0, rocks });
  assert.ok(world.collisionDepth_m({ x_m: 15, z_m: 8, heading_rad: 0 }) > 0);
  assert.ok(world.collisionDepth_m({ x_m: 21, z_m: 8, heading_rad: 0 }) > 0);
  assert.equal(world.collisionDepth_m({ x_m: 60, z_m: 8, heading_rad: 0 }), 0);
});

test('no sale del área conducible, pero puede volver', () => {
  const limit = DRIVE_TUNING.driveAreaRadius_m;
  const state = drive(start(0, 0, limit - 2), FORWARD, 10);
  assert.ok(state.z_m <= limit);
  const back = drive(state, { throttle: -1, steer: 0 }, 2);
  assert.ok(back.z_m < state.z_m);
});

test('el resultado no depende de los FPS', () => {
  const run = (fps) => {
    const controller = createRoverController({ world: FLAT, start: { x_m: 0, z_m: 0, heading_rad: 0 } });
    const script = [[1, { throttle: 1, steer: 0 }], [1.5, { throttle: 1, steer: 1 }], [1, { throttle: 0, steer: -1 }], [0.5, IDLE]];
    for (const [seconds, input] of script) {
      for (let i = 0; i < Math.round(seconds * fps); i++) controller.advance(1 / fps, input);
    }
    return controller.state;
  };
  const reference = run(60);
  for (const fps of [30, 144]) {
    const state = run(fps);
    for (const key of ['x_m', 'z_m', 'heading_rad']) assert.equal(state[key], reference[key], `${key} a ${fps} FPS`);
  }
});

test('la misma secuencia produce exactamente el mismo estado', () => {
  const script = (state) => drive(drive(state, { throttle: 1, steer: 0.5 }, 2), { throttle: -1, steer: -1 }, 2);
  assert.deepEqual(script(start(1)), script(start(1)));
});

test('un cuadro muy largo no simula de golpe el tiempo perdido', () => {
  let steps = 0;
  const controller = createRoverController({ world: FLAT, onStep: () => steps++ });
  controller.advance(30, FORWARD);
  assert.ok(steps <= 7, `pasos = ${steps}`);
});

test('el cuadro interpola entre pasos sin adelantarse al estado simulado', () => {
  const controller = createRoverController({ world: FLAT, start: { x_m: 0, z_m: 0, heading_rad: 0 } });
  for (let i = 0; i < 60; i++) controller.advance(1 / 60, FORWARD);
  const before = controller.state.z_m;
  const pose = controller.advance(0.004, FORWARD);
  assert.ok(pose.z_m <= controller.state.z_m + 1e-9);
  assert.ok(pose.z_m >= before - 0.05);
});
