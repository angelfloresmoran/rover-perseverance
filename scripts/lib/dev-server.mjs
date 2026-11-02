// Utilidades compartidas por los scripts que abren la escena en Chrome.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

export const URL_DEV = 'http://localhost:5173/';

async function isServerUp() {
  try {
    return (await fetch(URL_DEV)).ok;
  } catch {
    return false;
  }
}

// Reutiliza el servidor si ya responde. Devuelve el proceso solo si lo levantó aquí.
export async function ensureServer() {
  if (await isServerUp()) return null;
  const server = spawn('npx', ['vite'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    if (await isServerUp()) return server;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  server.kill();
  throw new Error(`El servidor no respondió en ${URL_DEV}`);
}

export function launchChrome() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
}
