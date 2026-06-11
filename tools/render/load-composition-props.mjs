import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} studioRoot
 * @param {string} compositionId
 */
export async function loadCompositionProps(studioRoot, compositionId) {
  const templatesRoot = path.join(studioRoot, 'src', 'templates');
  const dirs = await readdir(templatesRoot, {withFileTypes: true});

  for (const entry of dirs) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const metaPath = path.join(templatesRoot, entry.name, 'meta.json');
    try {
      const meta = JSON.parse(await readFile(metaPath, 'utf8'));
      if (meta.id === compositionId) {
        return {
          compositionId,
          durationFrames: meta.durationFrames ?? 90,
          defaultProps: meta.defaultProps ?? {},
          propsFields: meta.propsFields ?? [],
        };
      }
    } catch {
      // skip
    }
  }

  throw new Error(`Composition не найдена: ${compositionId}`);
}
