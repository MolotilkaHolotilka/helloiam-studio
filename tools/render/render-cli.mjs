#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderComposition} from './render-composition.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, '../..');
const compositionId = process.argv[2];

if (!compositionId) {
  console.error('Использование: npm run render -- <CompositionId>');
  process.exit(1);
}

console.log(`Рендер ${compositionId}…`);
const result = await renderComposition(STUDIO_ROOT, compositionId);
console.log(`PNG: ${result.stillPath}`);
console.log(`MP4: ${result.videoPath}`);
