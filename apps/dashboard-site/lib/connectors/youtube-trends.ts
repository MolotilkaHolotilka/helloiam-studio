import { hasHashtag } from '../hashtags';
import { getEnabledHashtagTags } from '../youtube-hashtag-config';
import { mergeTagTrendsIntoDay } from '../youtube-trends-db';
import { getSeenVideoIds, markVideosSeen } from '../youtube-trends-seen';
import type { TagTrendSnapshot } from '../youtube-trends-types';
import {
  fetchYouTubeVideoDetails,
  isPublishedWithin24h,
  searchYouTubeVideosPaginated,
} from '../youtube-search-api';

interface VideoMetrics {
  videoId: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

async function collectTrendForTag(apiKey: string, tag: string): Promise<TagTrendSnapshot> {
  const query = `#${tag}`;
  const hits = await searchYouTubeVideosPaginated(apiKey, query, 'date');
  const videoIds = hits.map((hit) => hit.videoId);
  const seen = getSeenVideoIds(tag);
  const newIds = videoIds.filter((id) => !seen.has(id));

  const details = await fetchYouTubeVideoDetails(apiKey, newIds);
  const metrics: VideoMetrics[] = [];

  for (const videoId of newIds) {
    const api = details.get(videoId);
    if (!api) continue;

    const title = api.snippet.title ?? '';
    const description = api.snippet.description ?? '';
    if (!hasHashtag([title, description], tag)) continue;

    const publishedAt = api.snippet.publishedAt;
    if (!isPublishedWithin24h(publishedAt)) continue;

    metrics.push({
      videoId,
      publishedAt,
      viewCount: Number(api.statistics.viewCount ?? 0),
      likeCount: Number(api.statistics.likeCount ?? 0),
      commentCount: Number(api.statistics.commentCount ?? 0),
    });
  }

  markVideosSeen(tag, metrics.map((item) => item.videoId));

  return {
    tag,
    newVideos: metrics.length,
    newVideosPublished24h: metrics.length,
    newViews: metrics.reduce((sum, item) => sum + item.viewCount, 0),
    newLikes: metrics.reduce((sum, item) => sum + item.likeCount, 0),
    newComments: metrics.reduce((sum, item) => sum + item.commentCount, 0),
  };
}

export async function collectAndSaveYouTubeTrends(
  youtubeApiKey = process.env.YOUTUBE_API_KEY,
) {
  if (!youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY is required');
  }

  const hashtags = getEnabledHashtagTags();
  if (hashtags.length === 0) {
    return [];
  }

  const snapshots: TagTrendSnapshot[] = [];
  for (const tag of hashtags) {
    snapshots.push(await collectTrendForTag(youtubeApiKey, tag));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const date = new Date().toISOString().slice(0, 10);
  mergeTagTrendsIntoDay(date, snapshots);

  const totalNew = snapshots.reduce((sum, item) => sum + item.newVideos, 0);
  console.log(`[youtube-trends] Saved trends for ${date}: ${totalNew} new videos across ${snapshots.length} tags`);

  return snapshots;
}
