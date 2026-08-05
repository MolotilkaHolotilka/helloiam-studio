import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {LEGACY_TEMPLATE_ALIASES, normalizeTemplateId} from './rubric/rubric-ids.mjs';

/**
 * @param {string} templateId
 */
function templateSlug(templateId) {
  return templateId
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])(\d)/g, '$1-$2')
    .toLowerCase();
}

/**
 * @param {string} studioRoot
 * @param {string} templateId
 */
export async function loadStoryTemplate(studioRoot, templateId) {
  const canonicalId = normalizeTemplateId(templateId);
  const dir = path.join(studioRoot, 'data', 'story-templates');
  const slug = templateSlug(canonicalId);
  const candidates = [
    path.join(dir, `${slug}.json`),
    path.join(dir, `${slug.replace(/-/g, '')}.json`),
  ];
  for (const filePath of candidates) {
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      if (data.id === canonicalId || data.id === templateId) {
        data.id = canonicalId;
        return data;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
      if (data.id === canonicalId || data.id === templateId || LEGACY_TEMPLATE_ALIASES[data.id] === canonicalId) {
        data.id = canonicalId;
        return data;
      }
    } catch {
      // skip unreadable files
    }
  }

  throw new Error(`Template not found: ${templateId}`);
}
