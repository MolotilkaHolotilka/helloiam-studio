#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGalleryServer} from './gallery-http.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, '..');
const GALLERY_DIR = path.join(STUDIO_ROOT, 'src', 'gallery');
const GALLERY_PORT = Number(process.env.GALLERY_PORT) || 3456;
const HOST = process.env.HOST || '0.0.0.0';

const picker = createGalleryServer({studioRoot: STUDIO_ROOT, galleryDir: GALLERY_DIR});

picker.on('error', (error) => {
  console.error(`Gallery failed on ${HOST}:${GALLERY_PORT}:`, error.message);
  process.exit(1);
});

picker.listen(GALLERY_PORT, HOST, () => {
  console.log(`HelloIAM Stories alpha v001`);
  console.log(`App: http://${HOST}:${GALLERY_PORT}`);
});

function shutdown() {
  picker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
