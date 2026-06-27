import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getNewsItem } from './news-service';
import {
  buildFavoriteKey,
  type FavoriteEntry,
  type FavoritesStore,
  type FavoriteType,
} from './favorites-types';
import { getYouTubeVideo } from './youtube-service';
import type { NewsItem } from './types';
import type { YouTubeVideo } from './youtube-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): FavoritesStore {
  ensureDataDir();

  if (!existsSync(FAVORITES_FILE)) {
    return { items: [] };
  }

  const raw = readFileSync(FAVORITES_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as FavoritesStore;

  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

function saveStore(store: FavoritesStore) {
  ensureDataDir();
  writeFileSync(FAVORITES_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function listFavorites(): FavoriteEntry[] {
  return [...loadStore().items].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function getFavoriteIdSet(): Set<string> {
  return new Set(loadStore().items.map((item) => buildFavoriteKey(item.type, item.id)));
}

export function isFavorite(type: FavoriteType, id: string): boolean {
  return getFavoriteIdSet().has(buildFavoriteKey(type, id));
}

export function toggleFavorite(type: FavoriteType, id: string): boolean {
  const store = loadStore();
  const key = buildFavoriteKey(type, id);
  const index = store.items.findIndex((item) => buildFavoriteKey(item.type, item.id) === key);

  if (index >= 0) {
    store.items.splice(index, 1);
    saveStore(store);
    return false;
  }

  store.items.push({
    type,
    id,
    addedAt: new Date().toISOString(),
  });
  saveStore(store);
  return true;
}

export type ResolvedFavorite =
  | { type: 'news'; entry: FavoriteEntry; item: NewsItem; date: string }
  | { type: 'youtube'; entry: FavoriteEntry; item: YouTubeVideo; date: string };

export function getResolvedFavorites(): ResolvedFavorite[] {
  const resolved: ResolvedFavorite[] = [];

  for (const entry of listFavorites()) {
    if (entry.type === 'news') {
      const result = getNewsItem(entry.id);
      if (result) {
        resolved.push({
          type: 'news',
          entry,
          item: result.item,
          date: result.date,
        });
      }
      continue;
    }

    const result = getYouTubeVideo(entry.id);
    if (result) {
      resolved.push({
        type: 'youtube',
        entry,
        item: result.item,
        date: result.date,
      });
    }
  }

  return resolved;
}

export { buildFavoriteKey };
