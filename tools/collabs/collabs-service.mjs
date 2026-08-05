import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const STATUSES = new Set(['candidate', 'partner', 'active', 'completed', 'paused', 'declined']);

function storePath(studioRoot) {
  return path.join(studioRoot, 'data', 'collabs.json');
}

async function loadStore(studioRoot) {
  const raw = await readFile(storePath(studioRoot), 'utf8').catch(() => '{"items":[]}');
  const data = JSON.parse(raw);
  return {items: Array.isArray(data.items) ? data.items : []};
}

async function saveStore(studioRoot, store) {
  await mkdir(path.dirname(storePath(studioRoot)), {recursive: true});
  await writeFile(storePath(studioRoot), `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanDate(value) {
  const date = cleanText(value, 10);
  if (!date) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())) {
    throw new Error('Collab date must use YYYY-MM-DD');
  }
  return date;
}

function cleanScore(value, fallback = 0) {
  const score = value === '' || value === undefined || value === null ? fallback : Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('Fit score must be from 0 to 100');
  return Math.round(score);
}

function normalizeInput(input, current = {}) {
  const status = cleanText(input.status ?? current.status ?? 'candidate', 20).toLowerCase();
  if (!STATUSES.has(status)) throw new Error('Unsupported Collabs status');
  const title = cleanText(input.title ?? current.title, 180);
  if (!title) throw new Error('Collab title is required');
  return {
    title,
    organization: cleanText(input.organization ?? current.organization, 120),
    contact: cleanText(input.contact ?? current.contact, 160),
    owner: cleanText(input.owner ?? current.owner, 80) || 'Unassigned',
    status,
    category: cleanText(input.category ?? current.category, 80) || 'Editorial',
    summary: cleanText(input.summary ?? current.summary, 500),
    nextStep: cleanText(input.nextStep ?? current.nextStep, 300),
    dueDate: cleanDate(input.dueDate ?? current.dueDate),
    deliverables: cleanText(input.deliverables ?? current.deliverables, 300),
    notes: cleanText(input.notes ?? current.notes, 700),
    fitScore: cleanScore(input.fitScore, current.fitScore || 0),
    projectId: cleanText(input.projectId ?? current.projectId, 80) || 'test-pack',
  };
}

export async function listCollabs(studioRoot) {
  const store = await loadStore(studioRoot);
  return store.items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function createCollab(studioRoot, input) {
  const store = await loadStore(studioRoot);
  const now = new Date().toISOString();
  const item = {id: randomUUID(), ...normalizeInput(input), createdAt: now, updatedAt: now};
  store.items.push(item);
  await saveStore(studioRoot, store);
  return item;
}

export async function updateCollab(studioRoot, id, input) {
  const store = await loadStore(studioRoot);
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Collab not found');
  const current = store.items[index];
  const item = {...current, ...normalizeInput(input, current), updatedAt: new Date().toISOString()};
  store.items[index] = item;
  await saveStore(studioRoot, store);
  return item;
}

export async function deleteCollab(studioRoot, id) {
  const store = await loadStore(studioRoot);
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Collab not found');
  const [item] = store.items.splice(index, 1);
  await saveStore(studioRoot, store);
  return item;
}
