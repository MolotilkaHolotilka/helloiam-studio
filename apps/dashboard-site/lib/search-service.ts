import { getFavoriteIdSet } from './favorites';
import { buildFavoriteKey } from './favorites-types';
import { hasHashtag } from './hashtags';
import { getNewsForDate, listArchiveDates } from './news-service';
import type { NewsItem } from './types';
import { getYouTubeForDate, listYouTubeDates } from './youtube-service';
import type { YouTubeVideo } from './youtube-types';

export interface ParsedSearchQuery {
  raw: string;
  terms: string[];
  hashtag?: string;
}

export type SearchResult =
  | { kind: 'news'; item: NewsItem; date: string; isFavorite: boolean }
  | { kind: 'youtube'; item: YouTubeVideo; date: string; isFavorite: boolean };

export function parseSearchQuery(input: string): ParsedSearchQuery | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.startsWith('#')) {
    const hashtag = raw.slice(1).replace(/^#+/, '').toLowerCase();
    if (!hashtag) return null;
    return { raw, terms: [], hashtag };
  }

  const terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  return { raw, terms };
}

function matchesText(haystack: string, terms: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return terms.every((term) => normalized.includes(term));
}

function matchesNews(item: NewsItem, query: ParsedSearchQuery): boolean {
  if (query.hashtag) return false;

  const haystack = [item.title, item.summary, item.fullSummary, item.sourceName].join(' ');
  return matchesText(haystack, query.terms);
}

function matchesYouTube(item: YouTubeVideo, query: ParsedSearchQuery): boolean {
  if (query.hashtag) {
    return hasHashtag(
      [item.title, item.description, item.summary, ...item.hashtags.map((tag) => `#${tag}`)],
      query.hashtag,
    ) || item.hashtags.some((tag) => tag.toLowerCase().includes(query.hashtag!));
  }

  const haystack = [
    item.title,
    item.description,
    item.summary,
    item.channelName,
    ...item.hashtags.map((tag) => `#${tag}`),
  ].join(' ');

  return matchesText(haystack, query.terms);
}

export function searchContent(queryInput: string): SearchResult[] {
  const query = parseSearchQuery(queryInput);
  if (!query) return [];

  const favoriteIds = getFavoriteIdSet();
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const date of listArchiveDates()) {
    const collection = getNewsForDate(date);
    if (!collection) continue;

    for (const item of collection.items) {
      if (!matchesNews(item, query)) continue;

      const key = buildFavoriteKey('news', item.id);
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        kind: 'news',
        item,
        date,
        isFavorite: favoriteIds.has(key),
      });
    }
  }

  for (const date of listYouTubeDates()) {
    const collection = getYouTubeForDate(date);
    if (!collection) continue;

    for (const item of collection.items) {
      if (!matchesYouTube(item, query)) continue;

      const key = buildFavoriteKey('youtube', item.id);
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        kind: 'youtube',
        item,
        date,
        isFavorite: favoriteIds.has(key),
      });
    }
  }

  return results.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    return b.date.localeCompare(a.date);
  });
}
