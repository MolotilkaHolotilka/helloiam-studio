import { getAllTrendsDates, getTrendsHistory } from './youtube-trends-db';
import { syncTrendsFromArchive } from './youtube-trends-backfill';
import { getEnabledTrendsTags, getTrendsTrackingConfig } from './youtube-trends-tracking';
import { buildTrendsChartData, computeTrendDirections } from './youtube-trends-chart';
import type { TrendMetric } from './youtube-trends-types';
import { TREND_METRIC_LABELS, TRENDS_HISTORY_DAYS } from './youtube-trends-types';

export { buildTrendsChartData, buildSingleTagSeries, computeTrendDirections, formatHashtag, formatTrendDate, getChartColors } from './youtube-trends-chart';

export function getTrendsDashboardData(metric: TrendMetric = 'newVideos') {
  if (getAllTrendsDates().length === 0) {
    syncTrendsFromArchive();
  }

  const trackingConfig = getTrendsTrackingConfig();
  const enabledTags = getEnabledTrendsTags();
  const history = getTrendsHistory(TRENDS_HISTORY_DAYS);
  const chartData = buildTrendsChartData(history, enabledTags, metric);
  const directions = computeTrendDirections(history, enabledTags, metric);

  return {
    trackingConfig,
    enabledTags,
    history,
    chartData,
    directions,
    metricLabels: TREND_METRIC_LABELS,
  };
}

export type { TrendMetric, DailyTrendsSnapshot, TrendDirection, TrendsChartPoint, TrendsSortKey } from './youtube-trends-types';
