import {readFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} studioRoot
 * @param {string} templateId
 */
function templateSlug(templateId) {
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export async function loadStoryTemplate(studioRoot, templateId) {
  const dir = path.join(studioRoot, 'data', 'story-templates');
  const slug = templateSlug(templateId);
  const candidates = [
    path.join(dir, `${slug}.json`),
    path.join(dir, `${slug.replace(/-/g, '')}.json`),
  ];
  let lastError;
  for (const filePath of candidates) {
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      if (data.id !== templateId) {
        throw new Error(`Шаблон не найден: ${templateId}`);
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw lastError ?? new Error(`Шаблон не найден: ${templateId}`);
}
