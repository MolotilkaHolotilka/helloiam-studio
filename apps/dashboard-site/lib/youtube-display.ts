import { extractHashtags } from './hashtags';

export function formatYouTubeViews(count: number): string {
  return `${formatYouTubeNumber(count)} просмотров`;
}

export function formatYouTubeLikes(count: number): string {
  return `${formatYouTubeNumber(count)} лайков`;
}

export function formatYouTubeComments(count: number): string {
  return `${formatYouTubeNumber(count)} комментариев`;
}

function formatYouTubeNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} тыс.`;
  }
  return n.toLocaleString('ru-RU');
}

export function formatYouTubePublishedAt(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function getMatchedHashtags(
  item: { hashtags: string[]; matchedHashtags?: string[] },
  enabledTags: string[],
): string[] {
  if (item.matchedHashtags?.length) {
    return item.matchedHashtags;
  }

  const enabled = new Set(enabledTags.map((tag) => tag.toLowerCase()));
  return item.hashtags.filter((tag) => enabled.has(tag.toLowerCase()));
}

export function prepareYouTubeDescription(text: string) {
  if (!text.trim()) {
    return { paragraphs: [] as string[], descriptionHashtags: [] as string[] };
  }

  const descriptionHashtags = extractHashtags(text);
  const paragraphs: string[] = [];

  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const withoutHashtags = trimmed.replace(/#[\p{L}\p{N}_]+/gu, '').trim();
    if (withoutHashtags) {
      paragraphs.push(trimmed);
    }
  }

  return { paragraphs, descriptionHashtags };
}
