#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncGalleryManifest} from './sync-gallery-manifest-lib.mjs';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const result = await syncGalleryManifest(studioRoot);
console.log(`Gallery sync: ${result.count} templates → composition-manifest.tsx`);
