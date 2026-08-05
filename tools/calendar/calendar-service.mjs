import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const STATUSES = new Set(['planned', 'draft', 'review', 'ready', 'published', 'blocked']);

function storePath(studioRoot) {
  return path.join(studioRoot, 'data', 'content-calendar.json');
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())) {
    throw new Error('Calendar date must use YYYY-MM-DD');
  }
  return date;
}

function normalizeInput(input, current = {}) {
  const status = cleanText(input.status || current.status || 'planned', 20).toLowerCase();
  if (!STATUSES.has(status)) throw new Error('Unsupported calendar status');
  const title = cleanText(input.title ?? current.title, 180);
  if (!title) throw new Error('Calendar title is required');
  return {
    title,
    date: cleanDate(input.date ?? current.date),
    channel: cleanText(input.channel ?? current.channel, 80) || 'Instagram',
    owner: cleanText(input.owner ?? current.owner, 80) || 'Unassigned',
    status,
    projectId: cleanText(input.projectId ?? current.projectId, 80) || 'test-pack',
    linkedPostId: cleanText(input.linkedPostId ?? current.linkedPostId, 100),
    notes: cleanText(input.notes ?? current.notes, 500),
  };
}

export async function listCalendarEvents(studioRoot) {
  const store = await loadStore(studioRoot);
  return store.items.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export async function createCalendarEvent(studioRoot, input) {
  const store = await loadStore(studioRoot);
  const now = new Date().toISOString();
  const event = {id: randomUUID(), ...normalizeInput(input), createdAt: now, updatedAt: now};
  store.items.push(event);
  await saveStore(studioRoot, store);
  return event;
}

export async function updateCalendarEvent(studioRoot, id, input) {
  const store = await loadStore(studioRoot);
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Calendar event not found');
  const current = store.items[index];
  const event = {...current, ...normalizeInput(input, current), updatedAt: new Date().toISOString()};
  store.items[index] = event;
  await saveStore(studioRoot, store);
  return event;
}

export async function deleteCalendarEvent(studioRoot, id) {
  const store = await loadStore(studioRoot);
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Calendar event not found');
  const [event] = store.items.splice(index, 1);
  await saveStore(studioRoot, store);
  return event;
}
