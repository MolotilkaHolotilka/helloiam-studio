/** Извлекает хештеги из текста (без #, lowercase) */
export function extractHashtags(...texts: string[]): string[] {
  const tags = new Set<string>();

  for (const text of texts) {
    if (!text) continue;
    const matches = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
    for (const match of matches) {
      tags.add(match.slice(1).toLowerCase());
    }
  }

  return [...tags];
}

/** Топ хештегов по частоте (только из разрешённого списка, если передан) */
export function getTopHashtags(
  items: { hashtags: string[]; matchedHashtags?: string[] }[],
  limit = 16,
  enabledTags?: string[],
) {
  const enabled = enabledTags ? new Set(enabledTags.map((tag) => tag.toLowerCase())) : null;
  const counts = new Map<string, number>();

  for (const item of items) {
    const tags = item.matchedHashtags?.length
      ? item.matchedHashtags
      : enabled
        ? item.hashtags.filter((tag) => enabled.has(tag.toLowerCase()))
        : item.hashtags;

    for (const tag of tags) {
      if (enabled && !enabled.has(tag.toLowerCase())) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

/** Фильтр по хештегу (только отслеживаемые) */
export function filterByHashtag<T extends { hashtags: string[]; matchedHashtags?: string[] }>(
  items: T[],
  tag?: string,
) {
  if (!tag) return items;
  const needle = tag.toLowerCase();
  return items.filter((item) => {
    const tags = item.matchedHashtags?.length ? item.matchedHashtags : item.hashtags;
    return tags.some((h) => h.toLowerCase() === needle);
  });
}

/** Есть ли в текстах один из разрешённых хештегов */
export function hasAnyHashtag(texts: string[], tags: Set<string> | string[]) {
  const allowed = tags instanceof Set ? tags : new Set(tags.map((t) => t.toLowerCase()));
  return extractHashtags(...texts).some((tag) => allowed.has(tag));
}

/** Есть ли конкретный хештег в текстах */
export function hasHashtag(texts: string[], tag: string) {
  const needle = tag.toLowerCase();
  return extractHashtags(...texts).some((item) => item === needle);
}

/** Приоритетные хештеги для поиска на YouTube */
export const YOUTUBE_HASHTAG_QUERIES = [
  '#Armenia',
  '#Yerevan',
  '#armenia travel',
  '#Ереван',
  '#Армения',
];
