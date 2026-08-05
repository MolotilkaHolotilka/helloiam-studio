import {readFile} from 'node:fs/promises';
import path from 'node:path';

const CHANGE_TYPES = new Set(['feature', 'fix', 'ui', 'api', 'infra', 'docs']);
const CHANGE_AREAS = new Set([
  'systems',
  'content',
  'brand',
  'site',
  'export',
  'generation',
  'settings',
  'routing',
  'assets',
  'deploy',
]);

/**
 * @param {string} studioRoot
 */
export async function loadChangelog(studioRoot) {
  const filePath = path.join(studioRoot, 'data', 'changelog.json');
  const raw = JSON.parse(await readFile(filePath, 'utf8'));
  if (!Array.isArray(raw.entries)) {
    throw new Error('changelog.json: entries must be an array');
  }
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    productVersion: raw.productVersion ?? '0.0.0',
    policy: raw.policy ?? '',
    entries: raw.entries.map(normalizeEntry),
  };
}

/**
 * @param {Record<string, unknown>} entry
 */
function normalizeEntry(entry) {
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  return {
    version: String(entry.version || ''),
    date: String(entry.date || ''),
    title: String(entry.title || ''),
    changes: changes.map((change) => ({
      type: CHANGE_TYPES.has(change.type) ? change.type : 'feature',
      area: CHANGE_AREAS.has(change.area) ? change.area : 'systems',
      summary: String(change.summary || ''),
      details: typeof change.details === 'string' ? change.details : '',
    })),
  };
}

export {CHANGE_TYPES, CHANGE_AREAS};
