import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {splitCssFrames} from '../../packages/css-pipeline/css-split-service.js';
import {cssToSpec} from './css-to-spec.mjs';
import {emitTemplate} from './emit-template.mjs';
import {syncGalleryManifest} from './sync-gallery-manifest-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STUDIO_ROOT = path.join(__dirname, '../..');

/**
 * @param {string} css
 */
export function listCssFrames(css) {
  return splitCssFrames(css).map((frame) => ({
    index: frame.index,
    frameId: frame.frameId,
  }));
}

/**
 * @param {string} css
 * @param {{ frameIndex?: number, project?: string }} [options]
 */
export async function importCssFromString(css, options = {}) {
  const frameIndex = options.frameIndex ?? 1;
  const {spec, frame} = await cssToSpec(css, {frameIndex});

  const emitted = await emitTemplate(
    {...spec, frameId: frame.frameId},
    STUDIO_ROOT,
    {project: options.project},
  );
  const synced = await syncGalleryManifest(STUDIO_ROOT);

  return {
    compositionId: emitted.compositionId,
    dirName: emitted.dirName,
    project: emitted.meta.project,
    family: spec.family,
    layerCount: spec.layers.length,
    imageCount: spec.imageLayers.length,
    frameId: frame.frameId,
    templateCount: synced.count,
  };
}
