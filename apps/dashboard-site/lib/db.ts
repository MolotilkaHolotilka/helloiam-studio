import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getTodayDate } from './app-date';
import type { DayCollection, NewsItem } from './types';

export { getTodayDate };

const DATA_DIR = path.join(process.cwd(), 'data', 'days');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function dayFilePath(date: string) {
  return path.join(DATA_DIR, `${date}.json`);
}

export function saveDayCollection(collection: DayCollection) {
  ensureDataDir();
  writeFileSync(dayFilePath(collection.date), JSON.stringify(collection, null, 2), 'utf-8');
}

export function getDayCollection(date: string): DayCollection | null {
  const filePath = dayFilePath(date);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as DayCollection;
}

export function getAllDates(): string[] {
  ensureDataDir();
  return readdirSync(DATA_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));
}

export function getNewsById(id: string): { item: NewsItem; date: string } | null {
  const date = id.slice(0, 10);
  const collection = getDayCollection(date);
  if (!collection) return null;

  const item = collection.items.find((entry) => entry.id === id);
  if (!item) return null;

  return { item, date };
}

export function getLatestDate(): string | null {
  const dates = getAllDates();
  return dates[0] ?? null;
}
