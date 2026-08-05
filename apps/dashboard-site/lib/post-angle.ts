import type { NewsItem } from './types';
import { getRubricById } from './rubrics';

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}

export function buildPostAngle(item: NewsItem): string {
  const hook = firstSentence(item.summary);
  const rubric = getRubricById(item.category);
  const label = rubric?.label ?? item.categoryLabel;

  return `Пост · ${label}: ${hook}`;
}
