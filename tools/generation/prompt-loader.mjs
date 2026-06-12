import {readFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} studioRoot
 */
export async function loadGenerationPrompts(studioRoot) {
  const filePath = path.join(studioRoot, 'docs', 'GENERATION_PROMPTS.md');
  const raw = await readFile(filePath, 'utf8');
  /** @type {Record<string, string>} */
  const sections = {};
  let current = '';
  for (const line of raw.split('\n')) {
    const match = line.match(/^##\s+([a-z0-9_-]+)\s*$/i);
    if (match) {
      current = match[1].toLowerCase();
      sections[current] = '';
      continue;
    }
    if (current) sections[current] += `${line}\n`;
  }
  return sections;
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function fillPromptTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
