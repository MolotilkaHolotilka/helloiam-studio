export type FavoriteType = 'news' | 'youtube';

export interface FavoriteEntry {
  type: FavoriteType;
  id: string;
  addedAt: string;
}

export interface FavoritesStore {
  items: FavoriteEntry[];
}

export function buildFavoriteKey(type: FavoriteType, id: string): string {
  return `${type}:${id}`;
}
