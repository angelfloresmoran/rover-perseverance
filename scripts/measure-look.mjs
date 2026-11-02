// Banco de medición: captura la escena con el tiempo congelado, con y sin cada efecto.
// Los efectos se quitan reescribiendo los módulos en memoria; no hay banderas de depuración en el producto.
import { mkdirSync, writeFileSync } from 'node:fs';
import { ensureServer, launchChrome, URL_DEV } from './lib/dev-server.mjs';
import { changeStats, exactDifference, frameTimeStats, shadowStats } from './lib/look-metrics.mjs';

const OUTPUT_DIR = '.check/measure';
const METRICS_PATH = '.check/metrics.json';
const FROZEN_TIME_S = 30;
const SETTLE_MS = 1_000;
const READY_TIMEOUT_MS = 90_000;
const TIMING_DURATION_MS = 6_000;
const CAPTURE_VIEWPORT = { width: 1600, height: 900 };
const TIMING_TARGETS = [
  { label: '1600x900@1', viewport: CAPTURE_VIEWPORT, scale: 1 },
  { label: '1728x1117@2', viewport: { width: 1728, height: 1117 }, scale: 2 },
];

const EXPOSE_SCENE = ['/src/main.js', 'window.__marsReady = true', 'window.__marsDebug = { renderer, scene }; window.__marsReady = true'];
const NO_GRAIN = ['/src/scene/post.js', '* 0.022;', '* 0.0;'];
const NO_SHADOWS = ['/src/main.js', 'renderer.shadowMap.enabled = true', 'renderer.shadowMap.enabled = false'];
const NO_DUST = ['/src/main.js', 'dust.points, ', ''];

async function routeRewrites(page, rewrites) {
  for (const path of new Set(rewrites.map(([file]) => file))) {
    await page.route(`**${path}*`, async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      for (const [file, from, to] of rewrites) {
        if (file !== path) continue;
        if (!body.includes(from)) throw new Error(`No se encontró "${from}" en ${file}: actualiza el banco de medición`);
        body = body.replace(from, to);
      }
      await route.fulfill({ response, body });
    });
  }
}

async function openScene(browser, { rewrites = [], time_s = FROZEN_TIME_S, viewport = CAPTURE_VIEWPORT, scale = 1 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await routeRewrites(page, [EXPOSE_SCENE, ...rewrites]);
  const query = time_s === null ? '' : `?t=${time_s}`;
  await page.goto(`${URL_DEV}${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__marsReady === true, null, { timeout: READY_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
  if (errors.length > 0) throw new Error(`Errores en la página:\n${errors.join('\n')}`);
  return { context, page };
}

async function capture(browser, name, options) {
  const { context, page } = await openScene(browser, options);
  const png = await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png` });
  await context.close();
  return png;
}

// Decodifica en el navegador para no agregar una dependencia de PNG.
async function decodePng(page, png) {
  const { width, height, base64 } = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < data.length; i += CHUNK) binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
    return { width: image.width, height: image.height, base64: btoa(binary) };
  }, png.toString('base64'));
  return { data: Buffer.from(base64, 'base64'), width, height };
}

// Corre en la página: mide cadencia y, si el navegador lo permite, tiempo real de GPU.
async function sampleFrames({ duration_ms, forceShadowUpdate }) {
  const { renderer, scene } = window.__marsDebug;
  const shadowLights = [];
  scene.traverse((object) => {
    if (object.isDirectionalLight && object.castShadow) shadowLights.push(object);
  });
  const gl = renderer.getContext();
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const queries = [];
  const frames_ms = [];
  let openQuery = null;
  let last = performance.now();
  const start = last;
  await new Promise((resolve) => {
    const tick = (now) => {
      if (forceShadowUpdate) for (const light of shadowLights) light.shadow.needsUpdate = true;
      if (timer) {
        if (openQuery) {
          gl.endQuery(timer.TIME_ELAPSED_EXT);
          queries.push(openQuery);
          openQuery = null;
        }
        if (now - start < duration_ms) {
          openQuery = gl.createQuery();
          gl.beginQuery(timer.TIME_ELAPSED_EXT, openQuery);
        }
      }
      frames_ms.push(now - last);
      last = now;
      if (now - start < duration_ms) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const gpu_ms = timer && !gl.getParameter(timer.GPU_DISJOINT_EXT)
    ? queries.filter((q) => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)).map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
    : [];
  return { frames_ms: frames_ms.slice(10), gpu_ms: gpu_ms.slice(10), shadow_lights: shadowLights.length };
}

async function renderInfo() {
  const { renderer } = window.__marsDebug;
  renderer.info.autoReset = false;
  await new Promise(requestAnimationFrame);
  renderer.info.reset();
  await new Promise(requestAnimationFrame);
  const { calls, triangles } = renderer.info.render;
  renderer.info.autoReset = true;
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    calls,
    triangles,
    buffer: [renderer.domElement.width, renderer.domElement.height],
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'desconocida',
  };
}

async function measureTiming(browser, { label, viewport, scale }) {
  const { context, page } = await openScene(browser, { time_s: null, viewport, scale });
  const info = await page.evaluate(renderInfo);
  const steady = await page.evaluate(sampleFrames, { duration_ms: TIMING_DURATION_MS, forceShadowUpdate: false });
  const update = await page.evaluate(sampleFrames, { duration_ms: TIMING_DURATION_MS / 2, forceShadowUpdate: true });
  await context.close();
  return {
    label,
    ...info,
    shadow_lights: steady.shadow_lights,
    frame: frameTimeStats(steady.frames_ms),
    gpu: { ...frameTimeStats(steady.gpu_ms), renderer: info.gpu },
    gpu_with_shadow_update: frameTimeStats(update.gpu_ms),
  };
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const server = await ensureServer();
const browser = await launchChrome();
let exitCode = 0;
try {
  const full = await capture(browser, 'full', {});
  const repeat = await capture(browser, 'full-repeat', {});
  const clean = await capture(browser, 'clean', { rewrites: [NO_GRAIN] });
  const later = await capture(browser, 'clean-later', { rewrites: [NO_GRAIN], time_s: FROZEN_TIME_S + 0.5 });
  const noShadows = await capture(browser, 'no-shadows', { rewrites: [NO_GRAIN, NO_SHADOWS] });
  const noDust = await capture(browser, 'no-dust', { rewrites: [NO_GRAIN, NO_DUST] });

  const decoder = await browser.newPage();
  const decode = (png) => decodePng(decoder, png);
  const [fullImage, repeatImage, cleanImage, laterImage, noShadowsImage, noDustImage] = await Promise.all(
    [full, repeat, clean, later, noShadows, noDust].map(decode),
  );
  await decoder.close();

  const determinism = exactDifference(fullImage, repeatImage);
  const timing = [];
  for (const target of TIMING_TARGETS) timing.push(await measureTiming(browser, target));

  const metrics = {
    frozen_time_s: FROZEN_TIME_S,
    determinism,
    shadows: shadowStats(cleanImage, noShadowsImage),
    dust: changeStats(cleanImage, noDustImage),
    motion_over_0_5s: changeStats(laterImage, cleanImage),
    timing,
  };
  writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(JSON.stringify(metrics, null, 2));
  console.log(`\nMétricas: ${METRICS_PATH}\nCapturas: ${OUTPUT_DIR}/`);
  if (determinism.differing_pixels > 0) {
    console.log('\nMEDICIÓN: mismo tiempo, imagen distinta');
    exitCode = 1;
  } else {
    console.log('\nMEDICIÓN: OK');
  }
} finally {
  await browser.close();
  server?.kill();
}
process.exit(exitCode);
