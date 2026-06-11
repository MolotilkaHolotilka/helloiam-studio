#!/usr/bin/env node
import {spawn, exec, execSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGalleryServer} from './gallery-http.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, '..');
const GALLERY_DIR = path.join(STUDIO_ROOT, 'src', 'gallery');
const ENTRY = 'src/gallery/index.ts';
const STUDIO_PORT = 3000;
const PICKER_PORT = 3456;

function freePort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, {stdio: 'ignore', shell: true});
  } catch {
    // port already free
  }
}

function openBrowser(url) {
  const platform = process.platform;
  if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

console.log('Останавливаем старые процессы…');
freePort(STUDIO_PORT);
freePort(PICKER_PORT);
try {
  execSync('pkill -f "remotion studio" 2>/dev/null', {stdio: 'ignore', shell: true});
} catch {
  // ignore
}

await new Promise((r) => setTimeout(r, 800));

const studio = spawn(
  'npx',
  ['remotion', 'studio', ENTRY, '--force-new'],
  {cwd: STUDIO_ROOT, stdio: 'inherit', shell: true},
);

const picker = createGalleryServer({studioRoot: STUDIO_ROOT, galleryDir: GALLERY_DIR});

picker.on('error', (error) => {
  console.error(`\nНе удалось запустить галерею на :${PICKER_PORT}:`, error.message);
  console.error('Закройте старый терминал с preview или выполните: npm run stop\n');
  studio.kill('SIGTERM');
  process.exit(1);
});

picker.listen(PICKER_PORT, () => {
  const url = `http://localhost:${PICKER_PORT}`;
  console.log(`\nHelloIAM Studio — галерея: ${url}`);
  console.log(`Remotion Studio:           http://localhost:${STUDIO_PORT}\n`);
  openBrowser(url);
});

function shutdown() {
  studio.kill('SIGTERM');
  picker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

studio.on('exit', (code) => {
  picker.close();
  process.exit(code ?? 0);
});
