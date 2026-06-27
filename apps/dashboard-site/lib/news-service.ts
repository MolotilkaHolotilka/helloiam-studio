import { collectArmeniaNews } from './collector';
import {
  getAllDates,
  getDayCollection,
  getLatestDate,
  getNewsById,
  getTodayDate,
  saveDayCollection,
} from './db';
import { getRubricById, LEGACY_RUBRIC_IDS, RUBRIC_ORDER } from './rubrics';
import { DATA_SOURCES } from './sources';
import { extractSourceName } from './text-utils';
import type { DashboardStats, DayCollection, NewsItem } from './types';

function normalizeItem(item: NewsItem): NewsItem {
  const rawCategory = item.category || 'politics';
  const category = LEGACY_RUBRIC_IDS[rawCategory] ?? rawCategory;
  const rubric = getRubricById(category);

  return {
    ...item,
    category,
    categoryLabel: rubric?.label ?? item.categoryLabel ?? 'Новости',
    categoryEmoji: rubric?.emoji ?? item.categoryEmoji ?? '📰',
    sourceName: item.sourceName || extractSourceName(item.url),
    fullSummary: item.fullSummary || item.summary,
    dataSource: item.dataSource || 'exa',
    importanceScore: item.importanceScore ?? 0,
    faviconUrl: item.faviconUrl ?? '',
  };
}

function normalizeCollection(collection: DayCollection): DayCollection {
  return {
    ...collection,
    items: collection.items.map(normalizeItem),
  };
}

export async function runDailyCollection(force = false) {
  const date = getTodayDate();
  const existing = getDayCollection(date);

  if (existing && !force) {
    console.log(`[news] Collection for ${date} already exists (${existing.items.length} items)`);
    return normalizeCollection(existing);
  }

  console.log(`[news] Collecting news for ${date}...`);
  const items = await collectArmeniaNews();

  const collection: DayCollection = {
    date,
    collectedAt: new Date().toISOString(),
    items,
  };

  saveDayCollection(collection);
  console.log(`[news] Saved ${items.length} items for ${date}`);
  return normalizeCollection(collection);
}

export function getNewsForDate(date: string): DayCollection | null {
  const collection = getDayCollection(date);
  return collection ? normalizeCollection(collection) : null;
}

export function getNewsItem(id: string) {
  const result = getNewsById(id);
  if (!result) return null;
  return { ...result, item: normalizeItem(result.item) };
}

export function listArchiveDates() {
  return getAllDates();
}

export { getTodayDate, getLatestDate };

export function getNewsDateHref(date: string): string {
  return date === getTodayDate() ? '/' : `/?date=${date}`;
}

export function resolveDisplayDate(preferred?: string): string | null {
  if (preferred) {
    const collection = getDayCollection(preferred);
    if (collection) return preferred;
  }

  const today = getTodayDate();
  if (getDayCollection(today)) return today;

  return getLatestDate();
}

export function groupItemsByCategory(items: NewsItem[]) {
  const groups = new Map<string, NewsItem[]>();

  for (const item of items) {
    const key = item.category || 'other';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return RUBRIC_ORDER
    .filter((id) => groups.has(id))
    .map((id) => {
      const rubric = getRubricById(id);
      const first = groups.get(id)![0];
      return {
        id,
        label: rubric?.label ?? first.categoryLabel,
        emoji: rubric?.emoji ?? first.categoryEmoji,
        items: [...groups.get(id)!].sort((a, b) => b.importanceScore - a.importanceScore),
      };
    });
}

export function getTopStories(items: NewsItem[], limit = 5, category?: string) {
  const pool = category ? items.filter((item) => item.category === category) : items;
  return [...pool]
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, limit);
}

export function filterByRubric(items: NewsItem[], rubric?: string): NewsItem[] {
  if (!rubric || rubric === 'all') return items;
  return items.filter((item) => item.category === rubric);
}

export function computeDashboardStats(items: NewsItem[]): DashboardStats {
  const total = items.length;
  const activeSources = DATA_SOURCES.filter((s) => s.status === 'active').length;

  const avgImportance = total
    ? Math.round((items.reduce((sum, item) => sum + item.importanceScore, 0) / total) * 10) / 10
    : 0;

  const categoryCounts = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const current = categoryCounts.get(item.category) ?? { label: item.categoryLabel, count: 0 };
    current.count += 1;
    categoryCounts.set(item.category, current);
  }

  let topCategory = '—';
  let topCategoryCount = 0;
  for (const { label, count } of categoryCounts.values()) {
    if (count > topCategoryCount) {
      topCategory = label;
      topCategoryCount = count;
    }
  }

  return {
    total,
    activeSources,
    avgImportance,
    topCategory,
    topCategoryCount,
    rubricCount: categoryCounts.size,
  };
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export type { NewsItem, DayCollection, DashboardStats };
