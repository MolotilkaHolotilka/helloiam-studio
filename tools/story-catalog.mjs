import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const KEEP_STORY_FILES = [
  'format-01.json',
  'helloiam-wine-v1.json',
  'format-03.json',
  'iam-matsun-deep-dive.json',
  'green-plate-intro.json',
];

function formatSortKey(name) {
  const match = /Format\s+(\d+)/i.exec(name || '');
  return match ? Number(match[1]) : 999;
}

/**
 * @param {string} studioRoot
 */
async function loadTemplateCovers(galleryDir) {
  try {
    return JSON.parse(await readFile(path.join(galleryDir, 'template-covers.json'), 'utf8'));
  } catch {
    return {};
  }
}

export async function rebuildStoryCatalog(studioRoot) {
  const storyDir = path.join(studioRoot, 'data', 'story-templates');
  const galleryDir = path.join(studioRoot, 'src', 'gallery');
  const covers = await loadTemplateCovers(galleryDir);
  const catalogTemplates = [];

  for (const file of KEEP_STORY_FILES) {
    try {
      const story = JSON.parse(await readFile(path.join(storyDir, file), 'utf8'));
      const entry = {
        id: story.id,
        project: story.project,
        name: story.name,
        description: story.description,
        tag: story.tag,
        cardCount: story.cards?.length ?? 0,
      };
      if (covers[story.id]) entry.coverImage = covers[story.id];
      catalogTemplates.push(entry);
    } catch {
      // optional file
    }
  }
  catalogTemplates.sort((a, b) => formatSortKey(a.name) - formatSortKey(b.name));

  const catalog = {
    projects: [
      {
        id: 'helloiam',
        name: 'HelloIAM',
        description: 'Брендовые сторис и карусели',
        accent: '#FF5C45',
      },
    ],
    templates: catalogTemplates,
  };

  await writeFile(path.join(galleryDir, 'story-templates.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  return catalogTemplates;
}
