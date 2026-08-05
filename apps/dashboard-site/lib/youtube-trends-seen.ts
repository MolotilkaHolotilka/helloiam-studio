import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SEEN_PATH = path.join(process.cwd(), 'data', 'youtube-trends-seen.json');

type SeenStore = Record<string, string[]>;

function ensureDataDir() {
  const dir = path.dirname(SEEN_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadSeen(): SeenStore {
  ensureDataDir();
  if (!existsSync(SEEN_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SEEN_PATH, 'utf-8')) as SeenStore;
  } catch {
    return {};
  }
}

function saveSeen(store: SeenStore) {
  ensureDataDir();
  writeFileSync(SEEN_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function getSeenVideoIds(tag: string): Set<string> {
  const store = loadSeen();
  return new Set(store[tag] ?? []);
}

export function markVideosSeen(tag: string, videoIds: string[]) {
  if (videoIds.length === 0) return;
  const store = loadSeen();
  const existing = new Set(store[tag] ?? []);
  for (const id of videoIds) existing.add(id);
  store[tag] = [...existing];
  saveSeen(store);
}
