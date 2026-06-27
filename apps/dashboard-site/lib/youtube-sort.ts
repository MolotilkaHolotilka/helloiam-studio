import type { YouTubeVideo } from './youtube-types';

export type YouTubeVideoSortKey = 'views' | 'likes' | 'comments';

export const YOUTUBE_VIDEO_SORT_OPTIONS: YouTubeVideoSortKey[] = ['views', 'likes', 'comments'];

export const YOUTUBE_VIDEO_SORT_LABELS: Record<YouTubeVideoSortKey, string> = {
  views: 'Просмотры',
  likes: 'Лайки',
  comments: 'Комментарии',
};

export const YOUTUBE_VIDEO_SORT_MENU_LABELS: Record<YouTubeVideoSortKey, string> = {
  views: 'По просмотрам',
  likes: 'По лайкам',
  comments: 'По комментариям',
};

export const YOUTUBE_TOP_SECTION_TITLES: Record<YouTubeVideoSortKey, string> = {
  views: 'Топ по просмотрам',
  likes: 'Топ по лайкам',
  comments: 'Топ по комментариям',
};

export function parseYouTubeVideoSort(value?: string): YouTubeVideoSortKey {
  if (value === 'likes' || value === 'comments') return value;
  return 'views';
}

function compareYouTubeVideos(a: YouTubeVideo, b: YouTubeVideo, sort: YouTubeVideoSortKey): number {
  if (sort === 'likes') {
    return b.likeCount - a.likeCount || b.viewCount - a.viewCount;
  }

  if (sort === 'comments') {
    return b.commentCount - a.commentCount || b.viewCount - a.viewCount;
  }

  return b.viewCount - a.viewCount || b.likeCount - a.likeCount;
}

export function sortYouTubeVideos(
  items: YouTubeVideo[],
  sort: YouTubeVideoSortKey = 'views',
): YouTubeVideo[] {
  return [...items].sort((a, b) => compareYouTubeVideos(a, b, sort));
}

export function getTopYouTubeVideosBySort(
  items: YouTubeVideo[],
  sort: YouTubeVideoSortKey = 'views',
  limit = 3,
): YouTubeVideo[] {
  return sortYouTubeVideos(items, sort).slice(0, limit);
}
