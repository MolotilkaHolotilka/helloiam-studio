import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

// Post126SlideFly: no meta.json — manual composition, shares post-126 schema propsFields.
const POST126_PROPS_FIELDS = [
  {key: 'title', type: 'string', label: 'Title'},
  {key: 'quote', type: 'textarea', label: 'Quote'},
  {key: 'label', type: 'string', label: 'Label'},
  {key: 'image', type: 'image', label: 'Image'},
  {key: 'background', type: 'color', label: 'Background'},
  {key: 'titleColor', type: 'color', label: 'Title color'},
  {key: 'quoteColor', type: 'color', label: 'Quote color'},
  {key: 'labelColor', type: 'color', label: 'Label color'},
];

const MANUAL = {
  Post126SlideFly: {
    durationFrames: 90,
    propsFields: POST126_PROPS_FIELDS,
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
          propsFields: meta.propsFields ?? [],
        };
      }
    } catch {
      // skip
    }
  }

  throw new Error(`Composition не найдена: ${compositionId}`);
}
