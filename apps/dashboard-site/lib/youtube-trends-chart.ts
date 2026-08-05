import type {
  DailyTrendsSnapshot,
  TrendDirection,
  TrendMetric,
  TrendsChartPoint,
  TrendsSortKey,
} from './youtube-trends-types';

const CHART_COLORS = [
  '#ff5c45',
  '#2d8a5e',
  '#4a6fa5',
  '#c97b2b',
  '#6b5b95',
];

export function getChartColors() {
  return CHART_COLORS;
}

export function buildSingleTagSeries(
  history: DailyTrendsSnapshot[],
  tag: string,
  metric: TrendMetric,
) {
  return history
    .filter((day) => Boolean(day.tags[tag]))
    .map((day) => ({
      date: day.date,
      label: formatTrendDate(day.date),
      value: day.tags[tag]![metric],
    }));
}

export function formatChartAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 10_000) {
    return `${Math.round(value / 1000)}K`;
  }
  if (abs >= 1_000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(value);
}

export function formatChartTooltipValue(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

export const TRENDS_SORT_LABELS: Record<TrendsSortKey, string> = {
  growth: 'По росту',
  views: 'По просмотрам',
  videos: 'По видео',
  likes: 'По лайкам',
  comments: 'По комментариям',
  name: 'По имени',
};

export function sortTrendTags(
  tags: string[],
  history: DailyTrendsSnapshot[],
  sortKey: TrendsSortKey,
): string[] {
  if (sortKey === 'name') {
    return [...tags].sort((a, b) => a.localeCompare(b, 'ru'));
  }

  if (sortKey === 'growth') {
    const directions = computeTrendDirections(history, tags, 'newViews');
    const byTag = new Map(directions.map((item) => [item.tag, item.changePercent]));
    return [...tags].sort((a, b) => (byTag.get(b) ?? 0) - (byTag.get(a) ?? 0));
  }

  const metricBySort: Record<Exclude<TrendsSortKey, 'growth' | 'name'>, TrendMetric> = {
    views: 'newViews',
    videos: 'newVideos',
    likes: 'newLikes',
    comments: 'newComments',
  };

  const metric = metricBySort[sortKey as keyof typeof metricBySort];
  return [...tags].sort(
    (a, b) => sumTagMetric(history, b, metric) - sumTagMetric(history, a, metric),
  );
}

export function formatHashtag(tag: string) {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

export function formatTrendDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));
}

export function buildTrendsChartData(
  history: DailyTrendsSnapshot[],
  tags: string[],
  metric: TrendMetric,
): TrendsChartPoint[] {
  return history
    .filter((day) => tags.some((tag) => Boolean(day.tags[tag])))
    .map((day) => {
      const point: TrendsChartPoint = {
        date: day.date,
        label: formatTrendDate(day.date),
      };

      for (const tag of tags) {
        const snapshot = day.tags[tag];
        if (snapshot) {
          point[tag] = snapshot[metric];
        }
      }

      return point;
    });
}

export function computeTrendDirections(
  history: DailyTrendsSnapshot[],
  tags: string[],
  metric: TrendMetric = 'newVideos',
): TrendDirection[] {
  if (metric === 'newViews') {
    return tags.map((tag) => computeViewsDayOverDay(history, tag));
  }

  const daysWithData = history.filter((day) =>
    tags.some((tag) => Boolean(day.tags[tag])),
  );
  const recent = daysWithData.slice(-7);
  const previous = daysWithData.slice(-14, -7);

  return tags.map((tag) => {
    const currentValues = recent
      .filter((day) => day.tags[tag])
      .map((day) => day.tags[tag]![metric]);
    const previousValues = previous
      .filter((day) => day.tags[tag])
      .map((day) => day.tags[tag]![metric]);

    const current = currentValues.reduce((sum, value) => sum + value, 0) / Math.max(currentValues.length, 1);
    const average = previousValues.reduce((sum, value) => sum + value, 0) / Math.max(previousValues.length, 1);

    let changePercent = 0;
    if (average > 0) {
      changePercent = Math.round(((current - average) / average) * 100);
    } else if (current > 0) {
      changePercent = 100;
    }

    let direction: TrendDirection['direction'] = 'stable';
    if (changePercent > 15) direction = 'up';
    if (changePercent < -15) direction = 'down';

    return {
      tag,
      label: formatHashtag(tag),
      direction,
      changePercent,
      current: Math.round(current * 10) / 10,
      average: Math.round(average * 10) / 10,
    };
  });
}

export function sumTagMetric(
  history: DailyTrendsSnapshot[],
  tag: string,
  metric: TrendMetric,
  lastDays?: number,
) {
  const days = lastDays ? history.slice(-lastDays) : history;
  return days.reduce((sum, day) => {
    if (!day.tags[tag]) return sum;
    return sum + day.tags[tag][metric];
  }, 0);
}

export function normalizeSeriesToScale(
  points: { label: string; value: number; date: string }[],
): { label: string; value: number; date: string; raw: number }[] {
  const max = Math.max(...points.map((point) => point.value), 1);
  return points.map((point) => ({
    ...point,
    raw: point.value,
    value: Math.round((point.value / max) * 100),
  }));
}

export function getTagLatestMetric(
  history: DailyTrendsSnapshot[],
  tag: string,
  metric: TrendMetric,
): number {
  const daysWithTag = history.filter((day) => day.tags[tag]);
  const latest = daysWithTag.at(-1);
  return latest?.tags[tag]?.[metric] ?? 0;
}

export function computeViewsDayOverDay(
  history: DailyTrendsSnapshot[],
  tag: string,
): TrendDirection {
  const daysWithTag = history.filter((day) => day.tags[tag]);
  const latest = daysWithTag.at(-1);
  const previous = daysWithTag.length > 1 ? daysWithTag.at(-2) : undefined;

  const current = latest?.tags[tag]?.newViews ?? 0;
  const prev = previous?.tags[tag]?.newViews ?? 0;

  let changePercent = 0;
  if (prev > 0) {
    changePercent = Math.round(((current - prev) / prev) * 100);
  }

  let direction: TrendDirection['direction'] = 'stable';
  if (changePercent > 0) direction = 'up';
  if (changePercent < 0) direction = 'down';

  return {
    tag,
    label: formatHashtag(tag),
    direction,
    changePercent,
    current,
    average: prev,
  };
}
