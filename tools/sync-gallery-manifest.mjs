#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncGalleryManifest} from './gallery-sync.mjs';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await syncGalleryManifest(studioRoot);
console.log(`Synced ${result.count} compositions: ${result.ids.join(', ')}`);
