import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';

const SLIDE_FILE_RE = /^slide-(\d+)\.(png|jpe?g|webp)$/i;

function referencesRoot(studioRoot) {
  return path.join(studioRoot, 'public', 'generated', 'template-references');
}

function manifestPath(studioRoot) {
  return path.join(studioRoot, 'src', 'gallery', 'template-references.json');
}

/**
 * @param {string} studioRoot
 */
export async function loadTemplateReferencesManifest(studioRoot) {
  try {
    return JSON.parse(await readFile(manifestPath(studioRoot), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * @param {string} studioRoot
 * @param {string} templateId
 */
export async function listTemplateSlideReferences(studioRoot, templateId) {
  const manifest = await loadTemplateReferencesManifest(studioRoot);
  if (manifest[templateId] && typeof manifest[templateId] === 'object') {
    return manifest[templateId];
  }

  const dir = path.join(referencesRoot(studioRoot), templateId);
  /** @type {Record<number, string>} */
  const references = {};
  try {
    const files = await readdir(dir);
    for (const file of files) {
      const match = SLIDE_FILE_RE.exec(file);
      if (!match) continue;
      references[Number(match[1])] = `generated/template-references/${templateId}/${file}`;
    }
  } catch {
    // no references dir
  }
  return references;
}

/**
 * Scan public/generated/template-references and rebuild src/gallery/template-references.json
 * @param {string} studioRoot
 */
export async function syncTemplateReferencesManifest(studioRoot) {
  /** @type {Record<string, Record<string, string>>} */
  const manifest = {};

  let templateIds = [];
  try {
    templateIds = await readdir(referencesRoot(studioRoot));
  } catch {
    templateIds = [];
  }

  for (const templateId of templateIds) {
    const dir = path.join(referencesRoot(studioRoot), templateId);
    /** @type {Record<string, string>} */
    const slides = {};
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      const match = SLIDE_FILE_RE.exec(file);
      if (!match) continue;
      slides[String(match[1])] = `generated/template-references/${templateId}/${file}`;
    }
    if (Object.keys(slides).length > 0) manifest[templateId] = slides;
  }

  await writeFile(manifestPath(studioRoot), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}
