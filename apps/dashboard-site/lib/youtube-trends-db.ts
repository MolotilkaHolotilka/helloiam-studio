import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getTodayDate } from './db';
import type { DailyTrendsSnapshot, TagTrendSnapshot } from './youtube-trends-types';
import { TRENDS_HISTORY_DAYS } from './youtube-trends-types';

const TRENDS_DIR = path.join(process.cwd(), 'data', 'youtube-trends');

function ensureDataDir() {
  if (!existsSync(TRENDS_DIR)) {
    mkdirSync(TRENDS_DIR, { recursive: true });
  }
}

function dayFilePath(date: string) {
  return path.join(TRENDS_DIR, `${date}.json`);
}

function pruneOldSnapshots() {
  ensureDataDir();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRENDS_HISTORY_DAYS);

  for (const name of readdirSync(TRENDS_DIR)) {
    if (!name.endsWith('.json')) continue;
    const date = name.replace('.json', '');
    if (new Date(`${date}T12:00:00`) < cutoff) {
      unlinkSync(path.join(TRENDS_DIR, name));
    }
  }
}

export function getTrendsSnapshot(date: string): DailyTrendsSnapshot | null {
  const filePath = dayFilePath(date);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as DailyTrendsSnapshot;
  } catch {
    return null;
  }
}

export function mergeTagTrendsIntoDay(date: string, entries: TagTrendSnapshot[]) {
  ensureDataDir();
  pruneOldSnapshots();

  const existing = getTrendsSnapshot(date) ?? {
    date,
    collectedAt: new Date().toISOString(),
    tags: {},
  };

  for (const entry of entries) {
    const prev = existing.tags[entry.tag];
    if (!prev) {
      existing.tags[entry.tag] = { ...entry };
      continue;
    }

    existing.tags[entry.tag] = {
      tag: entry.tag,
      newVideos: prev.newVideos + entry.newVideos,
      newVideosPublished24h: prev.newVideosPublished24h + entry.newVideosPublished24h,
      newViews: prev.newViews + entry.newViews,
      newLikes: prev.newLikes + entry.newLikes,
      newComments: prev.newComments + entry.newComments,
    };
  }

  existing.collectedAt = new Date().toISOString();
  writeFileSync(dayFilePath(date), JSON.stringify(existing, null, 2), 'utf-8');
  return existing;
}

export function getTrendsHistory(days = TRENDS_HISTORY_DAYS): DailyTrendsSnapshot[] {
  ensureDataDir();
  const today = getTodayDate();
  const cutoff = new Date(`${today}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return readdirSync(TRENDS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace('.json', ''))
    .filter((date) => date >= cutoffStr && date <= today)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => getTrendsSnapshot(date))
    .filter((snapshot): snapshot is DailyTrendsSnapshot => snapshot !== null);
}

export function getAllTrendsDates(): string[] {
  ensureDataDir();
  return readdirSync(TRENDS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));
}
