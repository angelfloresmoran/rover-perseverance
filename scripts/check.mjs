// Revisión automática: abre la escena en Chrome headless, guarda una captura y lista errores.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const URL_DEV = 'http://localhost:5173/';
const SCREENSHOT_PATH = '.check/screenshot.png';
const READY_TIMEOUT_MS = 90_000;
const SETTLE_MS = 1_500;

async function isServerUp() {
  try {
    return (await fetch(URL_DEV)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isServerUp()) return null;
  const server = spawn('npx', ['vite'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    if (await isServerUp()) return server;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  server.kill();
  throw new Error(`El servidor no respondió en ${URL_DEV}`);
}

function printList(title, items) {
  console.log(`\n${title}: ${items.length}`);
  for (const item of items) console.log(`  - ${item}`);
}

const consoleErrors = [];
const consoleWarnings = [];
const pageErrors = [];
const failedRequests = [];
let readyFailure = null;

const server = await ensureServer();
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} (${request.failure()?.errorText})`));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.url()} (HTTP ${response.status()})`);
  });

  await page.goto(URL_DEV, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__marsReady === true, null, { timeout: READY_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
  } catch {
    readyFailure = `La escena no señaló window.__marsReady en ${READY_TIMEOUT_MS / 1000} s`;
  }
  mkdirSync('.check', { recursive: true });
  await page.screenshot({ path: SCREENSHOT_PATH });
} finally {
  await browser.close();
  server?.kill();
}

printList('Errores de consola', consoleErrors);
printList('Excepciones de página', pageErrors);
printList('Peticiones fallidas', failedRequests);
printList('Advertencias de consola', consoleWarnings);
if (readyFailure) console.log(`\n${readyFailure}`);
console.log(`\nCaptura: ${SCREENSHOT_PATH}`);

const failed = consoleErrors.length + pageErrors.length + failedRequests.length > 0 || readyFailure;
console.log(failed ? '\nCHECK: FALLA' : '\nCHECK: OK');
process.exit(failed ? 1 : 0);
