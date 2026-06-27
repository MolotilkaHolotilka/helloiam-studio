export interface TagTrendSnapshot {
  tag: string;
  newVideos: number;
  newVideosPublished24h: number;
  newViews: number;
  newLikes: number;
  newComments: number;
}

export interface DailyTrendsSnapshot {
  date: string;
  collectedAt: string;
  tags: Record<string, TagTrendSnapshot>;
}

export type TrendMetric = 'newVideos' | 'newViews' | 'newLikes' | 'newComments';

export type TrendsSortKey = 'growth' | 'views' | 'videos' | 'likes' | 'comments' | 'name';

export interface TrendDirection {
  tag: string;
  label: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  current: number;
  average: number;
}

export interface TrendsChartPoint {
  date: string;
  label: string;
  [tag: string]: string | number;
}

export const TREND_METRIC_LABELS: Record<TrendMetric, string> = {
  newVideos: 'Новые видео',
  newViews: 'Просмотры',
  newLikes: 'Лайки',
  newComments: 'Комментарии',
};

export const TRENDS_HISTORY_DAYS = 14;
