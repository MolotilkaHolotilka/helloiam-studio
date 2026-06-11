import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

const MANUAL = {
  Post126SlideFly: {
    durationFrames: 90,
    defaultProps: {
      title: 'Hello, WORLD',
      quote: 'Armenia welcomed 172,705 international visitors in April 2026',
      label: 'AM NEWS',
      image: 'generated/post-126.png',
      background: '#D9DDE0',
      titleColor: '#0F0F10',
      quoteColor: '#D61E23',
      labelColor: '#4A7BFF',
    },
  },
};

/**
 * @param {string} studioRoot
 * @param {string} compositionId
 */
export async function loadCompositionProps(studioRoot, compositionId) {
  if (MANUAL[compositionId]) {
    return {compositionId, ...MANUAL[compositionId]};
  }

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
        };
      }
    } catch {
      // skip
    }
  }

  throw new Error(`Composition не найдена: ${compositionId}`);
}
