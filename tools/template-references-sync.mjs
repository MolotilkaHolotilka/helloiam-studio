#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncTemplateReferencesManifest} from './template-references.mjs';

const studioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = await syncTemplateReferencesManifest(studioRoot);
const count = Object.values(manifest).reduce((sum, slides) => sum + Object.keys(slides).length, 0);
console.log(`template-references.json: ${Object.keys(manifest).length} formats, ${count} slides`);
