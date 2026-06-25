import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, '..');

const KEEP_STORY_FILES = new Set([
  'rubric-01.json',
  'rubric-02.json',
  'rubric-03.json',
  'rubric-04.json',
  'rubric-05.json',
  'rubric-06.json',
]);

/** Legacy cover paths keyed by Rubric id */
const COVER_BY_RUBRIC = {
  Rubric01: 'generated/template-cover-format01.png',
  Rubric02: 'generated/template-cover-wine.png',
  Rubric03: 'generated/template-cover-matsun.png',
  Rubric04: 'generated/template-cover-green-plate-intro.png',
  Rubric05: 'generated/template-cover-news.png',
  Rubric06: 'emoji-style-reference.png',
};

/**
 * @param {string} file
 */
function storyTemplateIdFromFile(file) {
  const base = file.replace(/\.json$/, '');
  const parts = base.split('-').filter(Boolean);
  if (parts[0] === 'rubric' && parts[1]) {
    return `Rubric${parts[1].padStart(2, '0')}`;
  }
  return base
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * @param {string} file
 */
function storyTemplateSlugFromFile(file) {
  return file.replace(/\.json$/, '');
}

async function main() {
  const templatesDir = path.join(studioRoot, 'data', 'story-templates');
  const files = (await readdir(templatesDir)).filter((file) => file.endsWith('.json'));
  const templates = [];

  let coverMap = {};
  try {
    coverMap = JSON.parse(
      await readFile(path.join(studioRoot, 'src', 'gallery', 'template-covers.json'), 'utf8'),
    );
  } catch {
    coverMap = COVER_BY_RUBRIC;
  }

  for (const file of files.sort()) {
    if (!KEEP_STORY_FILES.has(file)) continue;
    const data = JSON.parse(await readFile(path.join(templatesDir, file), 'utf8'));
    const id = data.id || storyTemplateIdFromFile(file);
    const slug = storyTemplateSlugFromFile(file);
    const coverImage = coverMap[id] || COVER_BY_RUBRIC[id];
    templates.push({
      id,
      slug,
      project: data.project || 'helloiam',
      name: data.name || id,
      description: data.description || '',
      tag: data.tag || 'Carousel',
      cardCount: data.cards?.length ?? 0,
      width: data.width ?? 1080,
      height: data.height ?? 1350,
      durationPerCardSec: data.durationPerCardSec ?? 3,
      ...(coverImage ? {coverImage} : {}),
    });
  }

  templates.sort((a, b) => a.id.localeCompare(b.id));

  let projects = [{id: 'helloiam', name: 'HelloIAM', description: 'Brand carousels', accent: '#4A7BFF'}];
  try {
    const projectsRaw = JSON.parse(await readFile(path.join(studioRoot, 'src', 'projects.json'), 'utf8'));
    if (Array.isArray(projectsRaw.projects) && projectsRaw.projects.length) {
      projects = projectsRaw.projects;
    }
  } catch {
    // default project list
  }

  const catalog = {projects, templates};
  const outPath = path.join(studioRoot, 'src', 'gallery', 'story-templates.json');
  await writeFile(outPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${templates.length} templates to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
