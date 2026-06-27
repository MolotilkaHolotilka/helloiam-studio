import { collectYouTubeVideos } from './connectors/youtube';
import { collectAndSaveYouTubeTrends } from './connectors/youtube-trends';
import { extractHashtags, filterByHashtag, getTopHashtags } from './hashtags';
import { getEnabledHashtagTags } from './youtube-hashtag-config';
import { getMatchedHashtags } from './youtube-display';
import {
  getAllYouTubeDates,
  getLatestYouTubeDate,
  getTodayDate,
  getYouTubeCollection,
  getYouTubeVideoById,
  saveYouTubeCollection,
} from './youtube-db';
import type { YouTubeDayCollection, YouTubeStats, YouTubeVideo } from './youtube-types';

function normalizeYouTubeItem(item: YouTubeVideo): YouTubeVideo {
  const hashtags = item.hashtags?.length
    ? item.hashtags
    : extractHashtags(item.title, item.description, item.summary);
  const enabledTags = getEnabledHashtagTags();
  const matchedHashtags = item.matchedHashtags?.length
    ? item.matchedHashtags
    : getMatchedHashtags({ hashtags, matchedHashtags: [] }, enabledTags);

  return {
    ...item,
    hashtags,
    matchedHashtags,
  };
}

function normalizeYouTubeCollection(collection: YouTubeDayCollection): YouTubeDayCollection {
  return {
    ...collection,
    items: collection.items.map(normalizeYouTubeItem),
  };
}

export async function runYouTubeCollection(force = false) {
  const date = getTodayDate();
  const existing = getYouTubeCollection(date);

  if (existing && !force) {
    console.log(`[youtube] Collection for ${date} already exists (${existing.items.length} videos)`);
    return normalizeYouTubeCollection(existing);
  }

  console.log(`[youtube] Collecting videos for ${date}...`);
  const items = await collectYouTubeVideos();

  try {
    await collectAndSaveYouTubeTrends();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trends collection failed';
    console.warn(`[youtube] Trends: ${message}`);
  }

  const collection: YouTubeDayCollection = {
    date,
    collectedAt: new Date().toISOString(),
    items,
  };

  saveYouTubeCollection(collection);
  console.log(`[youtube] Saved ${items.length} videos for ${date}`);
  return normalizeYouTubeCollection(collection);
}

export function getYouTubeForDate(date: string): YouTubeDayCollection | null {
  const collection = getYouTubeCollection(date);
  return collection ? normalizeYouTubeCollection(collection) : null;
}

export function getYouTubeVideo(id: string) {
  const result = getYouTubeVideoById(id);
  if (!result) return null;
  return { ...result, item: normalizeYouTubeItem(result.item) };
}

export function listYouTubeDates() {
  return getAllYouTubeDates();
}

export { getTodayDate, filterByHashtag, getTopHashtags };
export { getLatestYouTubeDate } from './youtube-db';

export function resolveYouTubeDate(preferred?: string): string | null {
  if (preferred && getYouTubeCollection(preferred)) return preferred;

  const today = getTodayDate();
  if (getYouTubeCollection(today)) return today;

  return getLatestYouTubeDate();
}

export function computeYouTubeStats(items: YouTubeVideo[]): YouTubeStats {
  const total = items.length;
  const totalViews = items.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = items.reduce((sum, v) => sum + v.likeCount, 0);
  const totalComments = items.reduce((sum, v) => sum + v.commentCount, 0);

  const channelCounts = new Map<string, number>();
  for (const item of items) {
    channelCounts.set(item.channelName, (channelCounts.get(item.channelName) ?? 0) + 1);
  }

  let topChannel = '—';
  let maxCount = 0;
  for (const [channel, count] of channelCounts) {
    if (count > maxCount) {
      topChannel = channel;
      maxCount = count;
    }
  }

  return { total, totalViews, totalLikes, totalComments, topChannel };
}

export function getTopYouTubeVideos(items: YouTubeVideo[], limit = 3) {
  return [...items]
    .sort((a, b) => b.viewCount - a.viewCount || b.likeCount - a.likeCount)
    .slice(0, limit);
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
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

export function formatFreshness(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'только что';
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 день назад';
  if (days < 7) return `${days} дн. назад`;
  return formatShortDate(iso);
}

export type { YouTubeVideo, YouTubeDayCollection, YouTubeStats };
