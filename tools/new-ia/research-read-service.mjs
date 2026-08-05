import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

const SOURCES = {
  news: 'days',
  videos: 'youtube-days',
  trends: 'youtube-trends',
};

function dataDir(studioRoot, source) {
  return path.join(studioRoot, 'apps', 'dashboard-site', 'data', SOURCES[source]);
}

export async function listResearchDates(studioRoot, source) {
  const entries = await readdir(dataDir(studioRoot, source)).catch(() => []);
  return entries
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.slice(0, -5))
    .sort((a, b) => b.localeCompare(a));
}

async function readSnapshot(studioRoot, source, date) {
  const filePath = path.join(dataDir(studioRoot, source), `${date}.json`);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function getResearchSnapshot(studioRoot, source, requestedDate) {
  if (!Object.hasOwn(SOURCES, source)) {
    throw new Error(`Unsupported research source: ${source}`);
  }

  const dates = await listResearchDates(studioRoot, source);
  if (!dates.length) {
    return {source, date: null, dates: [], collectedAt: null, items: [], tags: {}};
  }

  const date = requestedDate && dates.includes(requestedDate) ? requestedDate : dates[0];
  const snapshot = await readSnapshot(studioRoot, source, date);
  return {
    source,
    date,
    dates,
    collectedAt: snapshot.collectedAt ?? null,
    items: Array.isArray(snapshot.items) ? snapshot.items : [],
    tags: snapshot.tags && typeof snapshot.tags === 'object' ? snapshot.tags : {},
  };
}

function selectedPeriodDates(allDates, period) {
  const count = period === 'month' ? 30 : period === 'week' ? 7 : 1;
  return allDates.slice(0, count);
}

function normalizeTag(value) {
  return String(value || '').trim().replace(/^#+/, '').toLowerCase();
}

export async function getTrendFeed(studioRoot, options = {}) {
  const period = ['day', 'week', 'month'].includes(options.period) ? options.period : 'day';
  const source = ['all', 'youtube', 'news', 'tiktok'].includes(options.source) ? options.source : 'all';
  const hashtag = normalizeTag(options.hashtag);
  const [newsDates, videoDates, trendDates] = await Promise.all([
    listResearchDates(studioRoot, 'news'),
    listResearchDates(studioRoot, 'videos'),
    listResearchDates(studioRoot, 'trends'),
  ]);
  const [selectedNewsDates, selectedVideoDates, selectedTrendDates] = [newsDates, videoDates, trendDates].map((dates) => selectedPeriodDates(dates, period));
  const [newsSnapshots, videoSnapshots, trendSnapshots] = await Promise.all([
    Promise.all(selectedNewsDates.map((date) => readSnapshot(studioRoot, 'news', date).then((snapshot) => ({date, snapshot})))),
    Promise.all(selectedVideoDates.map((date) => readSnapshot(studioRoot, 'videos', date).then((snapshot) => ({date, snapshot})))),
    Promise.all(selectedTrendDates.map((date) => readSnapshot(studioRoot, 'trends', date).then((snapshot) => ({date, snapshot})))),
  ]);
  const tagMap = new Map();
  for (const {snapshot} of trendSnapshots) {
    for (const row of Object.values(snapshot.tags || {})) {
      const tag = normalizeTag(row.tag);
      if (!tag) continue;
      const current = tagMap.get(tag) || {tag, newVideos: 0, newViews: 0, newLikes: 0, newComments: 0};
      current.newVideos += Number(row.newVideos || 0);
      current.newViews += Number(row.newViews || 0);
      current.newLikes += Number(row.newLikes || 0);
      current.newComments += Number(row.newComments || 0);
      tagMap.set(tag, current);
    }
  }
  const seen = new Set();
  const youtube = [];
  for (const {date, snapshot} of videoSnapshots) {
    for (const item of snapshot.items || []) {
      const key = item.videoId || item.id;
      if (!key || seen.has(`youtube:${key}`)) continue;
      const tags = [...(item.hashtags || []), ...(item.matchedHashtags || [])].map(normalizeTag);
      if (hashtag && !tags.some((tag) => tag.includes(hashtag))) continue;
      seen.add(`youtube:${key}`);
      youtube.push({kind: 'youtube', date, item});
    }
  }
  const news = [];
  for (const {date, snapshot} of newsSnapshots) {
    for (const item of snapshot.items || []) {
      if (!item.id || seen.has(`news:${item.id}`)) continue;
      const text = [item.title, item.summary, item.category, item.categoryLabel].join(' ').toLowerCase();
      if (hashtag && !text.includes(hashtag)) continue;
      seen.add(`news:${item.id}`);
      news.push({kind: 'news', date, item});
    }
  }
  youtube.sort((a, b) => Number(b.item.viewCount || 0) - Number(a.item.viewCount || 0));
  news.sort((a, b) => Number(b.item.importanceScore || 0) - Number(a.item.importanceScore || 0));
  const items = source === 'youtube' ? youtube : source === 'news' ? news : source === 'tiktok' ? [] : [...youtube, ...news].sort((a, b) => b.date.localeCompare(a.date));
  const tags = [...tagMap.values()].filter((row) => !hashtag || row.tag.includes(hashtag)).sort((a, b) => b.newViews - a.newViews);
  return {
    period,
    source,
    hashtag,
    dates: {news: selectedNewsDates, youtube: selectedVideoDates, trends: selectedTrendDates},
    connections: {youtube: videoDates.length > 0, news: newsDates.length > 0, tiktok: false},
    totals: {news: news.length, youtube: youtube.length, tiktok: 0, hashtags: tags.length},
    tags,
    items: items.slice(0, 60),
  };
}

async function readFavoritesStore(studioRoot) {
  const filePath = path.join(studioRoot, 'apps', 'dashboard-site', 'data', 'favorites.json');
  const store = JSON.parse(await readFile(filePath, 'utf8').catch(() => '{"items":[]}'));
  return Array.isArray(store.items) ? store.items : [];
}

export async function getResearchFavoriteIds(studioRoot) {
  const items = await readFavoritesStore(studioRoot);
  return items.map((item) => `${item.type}:${item.id}`);
}

async function allSourceItems(studioRoot, source) {
  const dates = await listResearchDates(studioRoot, source);
  const rows = [];
  for (const date of dates) {
    const snapshot = await readSnapshot(studioRoot, source, date);
    for (const item of Array.isArray(snapshot.items) ? snapshot.items : []) rows.push({date, item});
  }
  return rows;
}

export async function getResolvedResearchFavorites(studioRoot) {
  const entries = await readFavoritesStore(studioRoot);
  const [newsRows, videoRows] = await Promise.all([
    allSourceItems(studioRoot, 'news'),
    allSourceItems(studioRoot, 'videos'),
  ]);
  const lookup = new Map();
  for (const row of newsRows) if (!lookup.has(`news:${row.item.id}`)) lookup.set(`news:${row.item.id}`, {...row, kind: 'news'});
  for (const row of videoRows) if (!lookup.has(`youtube:${row.item.id}`)) lookup.set(`youtube:${row.item.id}`, {...row, kind: 'youtube'});
  return {
    ids: entries.map((entry) => `${entry.type}:${entry.id}`),
    items: entries
      .map((entry) => {
        const resolved = lookup.get(`${entry.type}:${entry.id}`);
        return resolved ? {...resolved, addedAt: entry.addedAt} : null;
      })
      .filter(Boolean),
  };
}

function matchesTerms(value, terms) {
  const haystack = String(value || '').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export async function searchResearch(studioRoot, queryInput) {
  const raw = String(queryInput || '').trim();
  if (!raw) return {query: raw, items: []};
  const hashtag = raw.startsWith('#') ? raw.slice(1).replace(/^#+/, '').toLowerCase() : '';
  const terms = hashtag ? [] : raw.toLowerCase().split(/\s+/).filter(Boolean);
  const favoriteIds = new Set(await getResearchFavoriteIds(studioRoot));
  const [newsRows, videoRows] = await Promise.all([
    allSourceItems(studioRoot, 'news'),
    allSourceItems(studioRoot, 'videos'),
  ]);
  const results = [];
  const seen = new Set();
  for (const {date, item} of newsRows) {
    const key = `news:${item.id}`;
    if (seen.has(key) || hashtag) continue;
    const text = [item.title, item.summary, item.fullSummary, item.sourceName].join(' ');
    if (!matchesTerms(text, terms)) continue;
    seen.add(key);
    results.push({kind: 'news', date, item, isFavorite: favoriteIds.has(key)});
  }
  for (const {date, item} of videoRows) {
    const key = `youtube:${item.id}`;
    if (seen.has(key)) continue;
    const tags = Array.isArray(item.hashtags) ? item.hashtags : [];
    const match = hashtag
      ? tags.some((tag) => String(tag).replace(/^#/, '').toLowerCase().includes(hashtag))
      : matchesTerms([item.title, item.description, item.summary, item.channelName, ...tags].join(' '), terms);
    if (!match) continue;
    seen.add(key);
    results.push({kind: 'youtube', date, item, isFavorite: favoriteIds.has(key)});
  }
  results.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.date.localeCompare(a.date));
  return {query: raw, items: results.slice(0, 100), total: results.length};
}

export async function getResearchArchive(studioRoot) {
  const sources = ['news', 'videos', 'trends'];
  const rows = new Map();
  for (const source of sources) {
    for (const date of await listResearchDates(studioRoot, source)) {
      const snapshot = await readSnapshot(studioRoot, source, date);
      const count = source === 'trends'
        ? Object.keys(snapshot.tags && typeof snapshot.tags === 'object' ? snapshot.tags : {}).length
        : Array.isArray(snapshot.items) ? snapshot.items.length : 0;
      const row = rows.get(date) || {date, news: 0, videos: 0, trends: 0};
      row[source] = count;
      rows.set(date, row);
    }
  }
  return {dates: [...rows.values()].sort((a, b) => b.date.localeCompare(a.date))};
}
