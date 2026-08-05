export interface Rubric {
  id: string;
  label: string;
  emoji: string;
  queries: string[];
  numResults: number;
  daysBack: number;
  category?: 'news';
  includeDomains?: string[];
}

export const RUBRICS: Rubric[] = [
  {
    id: 'politics',
    label: 'Политика',
    emoji: '🏛',
    queries: [
      'Armenia politics news',
      'Армения политика новости',
    ],
    numResults: 7,
    daysBack: 7,
    category: 'news',
  },
  {
    id: 'food',
    label: 'Еда',
    emoji: '🍽',
    queries: [
      'Armenia food',
      'Армения еда',
    ],
    numResults: 6,
    daysBack: 14,
  },
  {
    id: 'travel',
    label: 'Трэвел',
    emoji: '🗺',
    queries: [
      'Armenia travel Yerevan',
      'Армения путешествие Ереван',
    ],
    numResults: 6,
    daysBack: 60,
  },
  {
    id: 'general',
    label: 'Другие новости',
    emoji: '📰',
    queries: [
      'Armenia news',
      'Армения новости',
      'Armenia society economy culture',
      'Армения события экономика общество',
    ],
    numResults: 8,
    daysBack: 7,
    category: 'news',
  },
];

export const RUBRIC_ORDER = RUBRICS.map((r) => r.id);

/** Старые id из архива до смены рубрик */
export const LEGACY_RUBRIC_IDS: Record<string, string> = {
  media: 'politics',
  'wine-gastro': 'food',
  society: 'general',
  economy: 'general',
};

export function getRubricById(id: string) {
  const resolved = LEGACY_RUBRIC_IDS[id] ?? id;
  return RUBRICS.find((r) => r.id === resolved);
}
