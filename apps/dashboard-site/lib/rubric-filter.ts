import { LEGACY_RUBRIC_IDS, RUBRICS } from './rubrics';

export const RUBRIC_FILTER_IDS = RUBRICS.map((rubric) => rubric.id) as [
  string,
  ...string[],
];

export type RubricCategoryId = (typeof RUBRIC_FILTER_IDS)[number];
export type RubricFilterId = RubricCategoryId | 'all';

export const RUBRIC_FILTERS = [
  { id: 'all' as const, label: 'Все' },
  ...RUBRICS.map((rubric) => ({
    id: rubric.id as RubricCategoryId,
    label: rubric.label,
    emoji: rubric.emoji,
  })),
];

const VALID_RUBRIC_IDS = new Set<string>([
  ...RUBRIC_FILTER_IDS,
  ...Object.keys(LEGACY_RUBRIC_IDS),
]);

export function parseRubricFilter(value?: string): RubricFilterId {
  if (!value || value === 'all') return 'all';
  if (LEGACY_RUBRIC_IDS[value]) {
    return LEGACY_RUBRIC_IDS[value] as RubricCategoryId;
  }
  if (VALID_RUBRIC_IDS.has(value)) {
    return value as RubricCategoryId;
  }
  return 'all';
}

export function resolveRubricCategory(value: string): string {
  return LEGACY_RUBRIC_IDS[value] ?? value;
}
