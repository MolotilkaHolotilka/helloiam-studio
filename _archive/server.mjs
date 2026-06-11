#!/usr/bin/env node
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGalleryServer} from './gallery-http.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, '..');
const GALLERY_DIR = path.join(STUDIO_ROOT, 'src', 'gallery');
const ENTRY = 'src/gallery/index.ts';
const STUDIO_PORT = Number(process.env.STUDIO_PORT) || 3000;
const GALLERY_PORT = Number(process.env.GALLERY_PORT) || 3456;
const HOST = process.env.HOST || '0.0.0.0';

const studio = spawn(
  'npx',
  ['remotion', 'studio', ENTRY, '--force-new'],
  {cwd: STUDIO_ROOT, stdio: 'inherit', env: {...process.env}},
);

const picker = createGalleryServer({studioRoot: STUDIO_ROOT, galleryDir: GALLERY_DIR});

picker.on('error', (error) => {
  console.error(`Gallery failed on ${HOST}:${GALLERY_PORT}:`, error.message);
  studio.kill('SIGTERM');
  process.exit(1);
});

picker.listen(GALLERY_PORT, HOST, () => {
  console.log(`HelloIAM Studio v0.0.1`);
  console.log(`Gallery:         http://${HOST}:${GALLERY_PORT}`);
  console.log(`Remotion Studio: http://${HOST}:${STUDIO_PORT}`);
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
