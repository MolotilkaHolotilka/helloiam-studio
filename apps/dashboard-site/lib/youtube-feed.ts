export const YOUTUBE_FEED_PAGE_SIZE = 48;

export function parseYouTubeFeedLimit(value?: string): number {
  if (!value) return YOUTUBE_FEED_PAGE_SIZE;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < YOUTUBE_FEED_PAGE_SIZE) {
    return YOUTUBE_FEED_PAGE_SIZE;
  }

  return parsed;
}

export function nextYouTubeFeedLimit(current: number, total: number): number {
  return Math.min(total, current + YOUTUBE_FEED_PAGE_SIZE);
}
