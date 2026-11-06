// Prueba de conducción real: pulsa teclas en Chrome y comprueba cómo responde el rover.
import { mkdirSync } from 'node:fs';
import { ensureServer, launchChrome, URL_DEV } from './lib/dev-server.mjs';

const OUTPUT_DIR = '.check/drive';
const READY_TIMEOUT_MS = 90_000;
const EXPOSE = [
  'window.__marsReady = true',
  'window.__marsDebug = { controller, camera, rover, THREE, scene, get input() { return keyboard.input; } }; window.__marsReady = true',
];
const SIZE_TOLERANCE = 0.05;
const NASA_SIZE_M = { length_m: 3.0, width_m: 2.7, height_m: 2.2 };

const results = [];
function check(name, passed, detail = '') {
  results.push(passed);
  console.log(`${passed ? 'OK   ' : 'FALLA'} ${name}${detail ? `: ${detail}` : ''}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const server = await ensureServer();
const browser = await launchChrome();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  const warnings = [];
  const logs = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning') warnings.push(message.text());
    if (message.type() === 'log') logs.push(message.text());
  });
  await page.route('**/src/main.js*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body.includes(EXPOSE[0])) throw new Error('No se encontró la señal de escena lista');
    await route.fulfill({ response, body: body.replace(EXPOSE[0], EXPOSE[1]) });
  });
  await page.goto(URL_DEV, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__marsReady === true, null, { timeout: READY_TIMEOUT_MS });

  const state = () => page.evaluate(() => {
    const { controller, camera, rover, THREE } = window.__marsDebug;
    const { x_m, z_m, heading_rad, speed_m_s } = controller.state;
    rover.group.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    // Centro del rover en la pantalla: dentro de cuadro si está en [-1, 1].
    const center = new THREE.Vector3(0, 1, 0).applyMatrix4(rover.group.matrixWorld).project(camera);
    return { x_m, z_m, heading_rad, speed_m_s, ndc: [center.x, center.y] };
  });
  const hold = async (keys, duration_ms) => {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(duration_ms);
    for (const key of keys) await page.keyboard.up(key);
  };
  const distance = (a, b) => Math.hypot(a.x_m - b.x_m, a.z_m - b.z_m);
  const inFrame = ({ ndc: [x, y] }) => Math.abs(x) <= 1 && Math.abs(y) <= 1;
  const settle = () => page.waitForTimeout(900);

  const size = await page.evaluate(() => window.__marsDebug.rover.dimensions_m);
  for (const [key, expected] of Object.entries(NASA_SIZE_M)) {
    const error = Math.abs(size[key] - expected) / expected;
    check(`tamaño ${key}`, error <= SIZE_TOLERANCE, `${size[key].toFixed(3)} m frente a ${expected} m (${(error * 100).toFixed(1)} %)`);
  }
  const report = logs.join('\n');
  for (const name of ['Mastcam_Z_cams', 'NavCams', 'hazcams_front', 'hazcams_rear', 'WATSON', 'Up_Look_Camera', 'Down_Look_Camera', 'lens']) {
    check(`la consola nombra ${name}`, report.includes(name));
  }
  await page.screenshot({ path: `${OUTPUT_DIR}/1-inicio.png` });

  const start = await state();
  check('rover en cuadro al inicio', inFrame(start), `ndc ${start.ndc.map((v) => v.toFixed(2))}`);

  await hold(['KeyW'], 2500);
  const afterForward = await state();
  check('W avanza hacia -Z', afterForward.z_m < start.z_m - 1, `${(start.z_m - afterForward.z_m).toFixed(2)} m`);
  await page.screenshot({ path: `${OUTPUT_DIR}/2-avance.png` });
  await settle();
  const stopped = await state();
  check('se detiene al soltar', stopped.speed_m_s === 0, `${stopped.speed_m_s} m/s`);

  await hold(['KeyS'], 1500);
  const afterBack = await state();
  check('S retrocede', afterBack.z_m > stopped.z_m + 0.3, `${(afterBack.z_m - stopped.z_m).toFixed(2)} m`);
  await settle();

  const beforeLeft = await state();
  await hold(['KeyW', 'KeyA'], 2500);
  const afterLeft = await state();
  check('A gira a la izquierda', afterLeft.heading_rad > beforeLeft.heading_rad + 0.1 && afterLeft.x_m < beforeLeft.x_m, `rumbo +${(afterLeft.heading_rad - beforeLeft.heading_rad).toFixed(2)} rad`);
  await settle();

  const beforeRight = await state();
  await hold(['KeyW', 'KeyD'], 2500);
  const afterRight = await state();
  check('D gira a la derecha', afterRight.heading_rad < beforeRight.heading_rad - 0.1, `rumbo ${(afterRight.heading_rad - beforeRight.heading_rad).toFixed(2)} rad`);
  await settle();

  const beforeSpin = await state();
  await hold(['ArrowLeft'], 1500);
  await settle();
  const afterSpin = await state();
  check('flecha izquierda gira en el sitio', afterSpin.heading_rad > beforeSpin.heading_rad + 0.1 && distance(afterSpin, beforeSpin) < 0.01);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await settle();
  const afterBlur = await state();
  check('al perder el foco, el rover se detiene', afterBlur.speed_m_s === 0, `${afterBlur.speed_m_s} m/s`);
  await page.keyboard.up('KeyW');

  const metaInput = await page.evaluate(() => window.__marsDebug.input);
  check('no queda ninguna tecla activa', metaInput.throttle === 0 && metaInput.steer === 0);

  // Recorrido largo: cámara siempre en cuadro.
  let framedAlways = true;
  let worst = 0;
  await page.keyboard.down('KeyW');
  for (const key of ['', 'KeyA', '', 'KeyD', '']) {
    if (key) await page.keyboard.down(key);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500);
      const current = await state();
      framedAlways &&= inFrame(current);
      worst = Math.max(worst, Math.abs(current.ndc[0]), Math.abs(current.ndc[1]));
    }
    if (key) await page.keyboard.up(key);
  }
  await page.keyboard.up('KeyW');
  check('rover en cuadro durante todo el recorrido', framedAlways, `máximo ndc ${worst.toFixed(2)}`);
  await page.screenshot({ path: `${OUTPUT_DIR}/3-huellas.png` });

  // Se gira la vista hacia atrás para ver las huellas.
  await settle();
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(1500, 470, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const orbited = await state();
  check('se puede girar la vista con el ratón', inFrame(orbited), `ndc ${orbited.ndc.map((v) => v.toFixed(2))}`);
  await page.screenshot({ path: `${OUTPUT_DIR}/4-vista-girada.png` });

  check('sin errores en la página', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('sin advertencias en la página', warnings.length === 0, warnings.slice(0, 3).join(' | '));
  console.log(`\nConsola del rover:\n${logs.filter((line) => line.includes('[Perseverance]')).join('\n')}`);
} finally {
  await browser.close();
  server?.kill();
}
const failed = results.filter((passed) => !passed).length;
console.log(`\nCONDUCCIÓN: ${failed === 0 ? 'OK' : `${failed} FALLAS`}`);
process.exit(failed === 0 ? 0 : 1);
