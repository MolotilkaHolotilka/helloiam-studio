const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export const MS_24H = 24 * 60 * 60 * 1000;
const SEARCH_PAGE_SIZE = 50;
/** YouTube search.list обычно отдаёт не больше ~500 результатов на запрос */
const MAX_PAGES_PER_QUERY = 10;

export function getPublishedAfter24h() {
  return new Date(Date.now() - MS_24H).toISOString();
}

export function isPublishedWithin24h(publishedAt: string) {
  return Date.now() - new Date(publishedAt).getTime() <= MS_24H;
}

export interface YouTubeSearchHit {
  videoId: string;
  title?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}

export interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

export async function searchYouTubeVideosPaginated(
  apiKey: string,
  query: string,
  order: 'date' | 'viewCount' = 'date',
): Promise<YouTubeSearchHit[]> {
  const results: YouTubeSearchHit[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      order,
      publishedAfter: getPublishedAfter24h(),
      maxResults: String(SEARCH_PAGE_SIZE),
      relevanceLanguage: 'ru',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`${YOUTUBE_API_URL}/search?${params}`);
    if (!response.ok) {
      const body = await response.text();
      const hint = response.status === 403
        ? ' (лимит YouTube API — попробуйте позже)'
        : '';
      throw new Error(`YouTube Search API error ${response.status}${hint}: ${body.slice(0, 120)}`);
    }

    const data = await response.json();
    for (const item of data.items ?? []) {
      const videoId = item.id?.videoId as string | undefined;
      if (!videoId) continue;
      results.push({
        videoId,
        title: item.snippet?.title,
        publishedAt: item.snippet?.publishedAt,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      });
    }

    pageToken = data.nextPageToken as string | undefined;
    pages += 1;
    if (pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (pageToken && pages < MAX_PAGES_PER_QUERY);

  return results;
}

export async function fetchYouTubeVideoDetails(
  apiKey: string,
  videoIds: string[],
): Promise<Map<string, YouTubeVideoDetails>> {
  const map = new Map<string, YouTubeVideoDetails>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: batch.join(','),
      key: apiKey,
    });

    const response = await fetch(`${YOUTUBE_API_URL}/videos?${params}`);
    if (!response.ok) {
      const body = await response.text();
      const hint = response.status === 403
        ? ' (лимит YouTube API — попробуйте позже)'
        : '';
      throw new Error(`YouTube Videos API error ${response.status}${hint}: ${body.slice(0, 120)}`);
    }

    const data = await response.json();
    for (const item of data.items ?? []) {
      map.set(item.id, item as YouTubeVideoDetails);
    }
  }

  return map;
}
