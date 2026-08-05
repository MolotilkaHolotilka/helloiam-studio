import { translate } from 'google-translate-api-x';
import { extractHashtags } from '../hashtags';
import { cleanText, truncateToSentences } from '../text-utils';
import { getEnabledHashtagTags } from '../youtube-hashtag-config';
import {
  fetchYouTubeVideoDetails,
  isPublishedWithin24h,
  searchYouTubeVideosPaginated,
} from '../youtube-search-api';
import type { YouTubeVideo } from '../youtube-types';

interface DiscoveredVideo {
  videoId: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
}

function dedupeDiscovered(videos: DiscoveredVideo[]) {
  const seen = new Set<string>();
  const unique: DiscoveredVideo[] = [];

  for (const video of videos) {
    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    unique.push(video);
  }

  return unique;
}

function parseDuration(iso?: string) {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;

  const h = match[1] ? `${match[1]}:` : '';
  const m = match[2] ?? '0';
  const s = (match[3] ?? '0').padStart(2, '0');
  const minutes = h ? m.padStart(2, '0') : m;
  return `${h}${minutes}:${s}`;
}

function scoreVideo(viewCount: number, likeCount: number, publishedAt: string) {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  let freshness = 1;
  if (ageHours <= 24) freshness = 4;
  else if (ageHours <= 72) freshness = 3;
  else if (ageHours <= 168) freshness = 2;

  const viewsScore = Math.min(4, Math.log10(viewCount + 1));
  const engagement = viewCount > 0 ? (likeCount / viewCount) * 500 : 0;
  const engagementScore = Math.min(2, engagement);

  return Math.min(10, Math.max(1, Math.round(freshness + viewsScore + engagementScore)));
}

function isRussian(text: string) {
  return (text.match(/[\u0400-\u04FF]/g) ?? []).length > (text.match(/[a-zA-Z]/g) ?? []).length;
}

async function toRussian(text: string) {
  if (!text || isRussian(text)) return text;
  try {
    const result = await translate(text, { to: 'ru' });
    return result.text;
  } catch {
    return text;
  }
}

function createYouTubeId(date: string, videoId: string) {
  return `${date}-${videoId}`;
}

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/watch')) {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function collectYouTubeVideos(
  _exaApiKey = process.env.EXA_API_KEY,
  youtubeApiKey = process.env.YOUTUBE_API_KEY,
) {
  if (!youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY is required. Get one at https://console.cloud.google.com/apis/credentials');
  }

  const enabledTags = getEnabledHashtagTags();
  if (enabledTags.length === 0) {
    throw new Error('Включите хотя бы один хештег для поиска');
  }

  const enabledSet = new Set(enabledTags);
  const discovered: DiscoveredVideo[] = [];

  for (const tag of enabledTags) {
    const results = await searchYouTubeVideosPaginated(youtubeApiKey, `#${tag}`, 'date');
    console.log(`[youtube] #${tag}: ${results.length} в выдаче YouTube за 24 ч`);
    for (const hit of results) {
      discovered.push({
        videoId: hit.videoId,
        url: `https://www.youtube.com/watch?v=${hit.videoId}`,
        title: hit.title,
        thumbnailUrl: hit.thumbnailUrl,
        publishedAt: hit.publishedAt,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const deduped = dedupeDiscovered(discovered);
  if (deduped.length === 0) {
    return [];
  }

  const details = await fetchYouTubeVideoDetails(youtubeApiKey, deduped.map((v) => v.videoId));
  const date = new Date().toISOString().slice(0, 10);

  const enriched = deduped
    .map((discoveredVideo) => {
      const api = details.get(discoveredVideo.videoId);
      if (!api) return null;

      const rawTitle = api.snippet.title ?? discoveredVideo.title ?? '';
      const rawDescription = cleanText(api.snippet.description ?? '');
      const publishedAt = api.snippet.publishedAt ?? discoveredVideo.publishedAt ?? new Date().toISOString();

      if (!isPublishedWithin24h(publishedAt)) return null;

      const allHashtags = extractHashtags(rawTitle, rawDescription);
      const matchedHashtags = allHashtags.filter((tag) => enabledSet.has(tag));
      if (matchedHashtags.length === 0) return null;

      const viewCount = Number(api.statistics.viewCount ?? 0);
      const likeCount = Number(api.statistics.likeCount ?? 0);
      const commentCount = Number(api.statistics.commentCount ?? 0);

      return {
        discoveredVideo,
        rawTitle,
        rawDescription,
        allHashtags,
        matchedHashtags,
        viewCount,
        likeCount,
        commentCount,
        publishedAt,
        channelName: api.snippet.channelTitle,
        thumbnailUrl:
          api.snippet.thumbnails.high?.url
          ?? api.snippet.thumbnails.medium?.url
          ?? api.snippet.thumbnails.default?.url
          ?? discoveredVideo.thumbnailUrl
          ?? '',
        duration: parseDuration(api.contentDetails?.duration),
        importanceScore: scoreVideo(viewCount, likeCount, publishedAt),
      };
    })
    .filter(Boolean) as Array<{
      discoveredVideo: DiscoveredVideo;
      rawTitle: string;
      rawDescription: string;
      allHashtags: string[];
      matchedHashtags: string[];
      viewCount: number;
      likeCount: number;
      commentCount: number;
      publishedAt: string;
      channelName: string;
      thumbnailUrl: string;
      duration: string;
      importanceScore: number;
    }>;

  const sorted = enriched.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  console.log(`[youtube] После фильтра по хештегам: ${sorted.length} видео за 24 ч`);

  const normalized: YouTubeVideo[] = await Promise.all(
    sorted.map(async (item) => {
      const [title, summary] = await Promise.all([
        toRussian(item.rawTitle),
        toRussian(truncateToSentences(item.rawDescription, 2)),
      ]);

      return {
        id: createYouTubeId(date, item.discoveredVideo.videoId),
        videoId: item.discoveredVideo.videoId,
        title,
        summary,
        description: item.rawDescription,
        url: item.discoveredVideo.url,
        thumbnailUrl: item.thumbnailUrl,
        channelName: item.channelName,
        publishedAt: item.publishedAt,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        importanceScore: item.importanceScore,
        duration: item.duration,
        hashtags: item.allHashtags,
        matchedHashtags: item.matchedHashtags,
      };
    }),
  );

  return normalized;
}
