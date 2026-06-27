import { extractHashtags } from './hashtags';
import { getEnabledHashtagSearchQueries } from './youtube-hashtag-config';
import { getAllYouTubeDates, getYouTubeCollection } from './youtube-db';
import { mergeTagTrendsIntoDay } from './youtube-trends-db';
import { getSeenVideoIds, markVideosSeen } from './youtube-trends-seen';
import type { TagTrendSnapshot } from './youtube-trends-types';
import { TRENDS_HISTORY_DAYS } from './youtube-trends-types';
import type { YouTubeVideo } from './youtube-types';

const MS_24H = 24 * 60 * 60 * 1000;

function videoMatchesTag(video: YouTubeVideo, tag: string) {
  const normalized = tag.toLowerCase();
  const tags = video.hashtags?.length
    ? video.hashtags
    : extractHashtags(video.title, video.description, video.summary);
  return tags.some((item) => item.toLowerCase() === normalized);
}

function isPublishedWithin24h(publishedAt: string, referenceMs: number) {
  return referenceMs - new Date(publishedAt).getTime() <= MS_24H;
}

export function syncTrendsFromArchive() {
  const tags = getEnabledHashtagSearchQueries()
    .map((query) => query.replace(/^#/, '').toLowerCase());

  if (tags.length === 0) return;

  const dates = getAllYouTubeDates()
    .sort((a, b) => a.localeCompare(b))
    .slice(-TRENDS_HISTORY_DAYS);

  for (const date of dates) {
    const collection = getYouTubeCollection(date);
    if (!collection) continue;

    const referenceMs = new Date(collection.collectedAt).getTime();
    const perTag = new Map<string, TagTrendSnapshot>();

    for (const tag of tags) {
      perTag.set(tag, {
        tag,
        newVideos: 0,
        newVideosPublished24h: 0,
        newViews: 0,
        newLikes: 0,
        newComments: 0,
      });
    }

    for (const video of collection.items) {
      const item: YouTubeVideo = {
        ...video,
        hashtags: video.hashtags?.length
          ? video.hashtags
          : extractHashtags(video.title, video.description, video.summary),
      };

      for (const tag of tags) {
        if (!videoMatchesTag(item, tag)) continue;

        const seen = getSeenVideoIds(tag);
        if (seen.has(item.videoId)) continue;

        const snapshot = perTag.get(tag)!;
        const within24h = isPublishedWithin24h(item.publishedAt, referenceMs);

        snapshot.newVideos += 1;
        if (within24h) snapshot.newVideosPublished24h += 1;
        snapshot.newViews += item.viewCount;
        snapshot.newLikes += item.likeCount;
        snapshot.newComments += item.commentCount;

        markVideosSeen(tag, [item.videoId]);
      }
    }

    const entries = [...perTag.values()].filter((entry) => entry.newVideos > 0);
    if (entries.length > 0) {
      mergeTagTrendsIntoDay(date, entries);
    }
  }
}
