#!/usr/bin/env node
import path from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from '../tools/load-env.mjs';
import {createGalleryServer} from './gallery-http.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, '..');
await loadEnvFile(STUDIO_ROOT);
const GALLERY_DIR = path.join(STUDIO_ROOT, 'src', 'gallery');
const GALLERY_PORT = Number(process.env.GALLERY_PORT) || 3456;
const HOST = process.env.HOST || '0.0.0.0';
const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT) || 3010;
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || `http://127.0.0.1:${DASHBOARD_PORT}`;
const DASHBOARD_DIR = path.join(STUDIO_ROOT, 'apps', 'dashboard-site');

process.env.DASHBOARD_ORIGIN = DASHBOARD_ORIGIN;

let dashboardChild = null;

function startDashboard() {
  const nextBin = path.join(DASHBOARD_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  const buildId = path.join(DASHBOARD_DIR, '.next', 'BUILD_ID');
  if (!existsSync(nextBin)) {
    console.warn('News / Trends dependencies are missing. Run: npm run dashboard:install');
    return;
  }
  const dashboardMode = existsSync(buildId) ? 'start' : 'dev';
  if (dashboardMode === 'dev') {
    console.warn('News / Trends production build is missing. Run: npm --prefix apps/dashboard-site run build');
  }
  console.log(`News / Trends dashboard: next ${dashboardMode} on ${DASHBOARD_ORIGIN}`);
  dashboardChild = spawn(process.execPath, [nextBin, dashboardMode, '-p', String(DASHBOARD_PORT)], {
    cwd: DASHBOARD_DIR,
    env: {...process.env, PORT: String(DASHBOARD_PORT)},
    stdio: 'inherit',
  });
  dashboardChild.on('error', (error) => {
    console.error('News / Trends dashboard failed to start:', error.message);
  });
  dashboardChild.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`News / Trends dashboard exited with code ${code}`);
    }
  });
}

const picker = createGalleryServer({studioRoot: STUDIO_ROOT, galleryDir: GALLERY_DIR});

picker.on('error', (error) => {
  console.error(`Gallery failed on ${HOST}:${GALLERY_PORT}:`, error.message);
  process.exit(1);
});

startDashboard();

picker.listen(GALLERY_PORT, HOST, () => {
  console.log(`HelloIAM Stories alpha v001`);
  console.log(`App: http://${HOST}:${GALLERY_PORT}`);
  console.log(`News / Trends: http://${HOST}:${GALLERY_PORT}/#/news-trends`);
  console.log(`Ideas dashboard proxy: http://${HOST}:${GALLERY_PORT}/ideas`);
});

function shutdown() {
  if (dashboardChild && !dashboardChild.killed) {
    dashboardChild.kill('SIGTERM');
  }
  picker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
