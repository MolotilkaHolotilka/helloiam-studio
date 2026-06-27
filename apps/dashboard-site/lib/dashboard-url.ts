import { getTodayDate } from './app-date';
import type { RubricFilterId } from './rubric-filter';
import type { YouTubeVideoSortKey } from './youtube-sort';
import { YOUTUBE_FEED_PAGE_SIZE } from './youtube-feed';

export type DashboardSource = 'exa' | 'youtube';
export type YouTubeTab = 'videos' | 'trends';

export function parseDashboardSource(value?: string): DashboardSource {
  return value === 'youtube' ? 'youtube' : 'exa';
}

export function parseYouTubeTab(value?: string): YouTubeTab {
  return value === 'trends' ? 'trends' : 'videos';
}

export function buildDashboardHref(options: {
  source?: DashboardSource;
  date?: string;
  tag?: string;
  tab?: YouTubeTab;
  trendTag?: string;
  rubric?: RubricFilterId | string;
  limit?: number;
  sort?: YouTubeVideoSortKey;
}): string {
  const today = getTodayDate();
  const params = new URLSearchParams();

  if (options.source === 'youtube') {
    params.set('source', 'youtube');
  }

  if (options.tab === 'trends') {
    params.set('tab', 'trends');
  }

  if (options.date && options.date !== today) {
    params.set('date', options.date);
  }

  if (options.tag && options.source === 'youtube' && options.tab !== 'trends') {
    params.set('tag', options.tag);
  }

  if (options.trendTag && options.source === 'youtube' && options.tab === 'trends') {
    params.set('trendTag', options.trendTag);
  }

  if (options.rubric && options.rubric !== 'all' && options.source !== 'youtube') {
    params.set('rubric', options.rubric);
  }

  if (
    options.limit
    && options.limit > YOUTUBE_FEED_PAGE_SIZE
    && options.source === 'youtube'
    && options.tab !== 'trends'
  ) {
    params.set('limit', String(options.limit));
  }

  if (
    options.sort
    && options.sort !== 'views'
    && options.source === 'youtube'
    && options.tab !== 'trends'
  ) {
    params.set('sort', options.sort);
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function buildSourceSwitchHref(target: DashboardSource, tab: YouTubeTab = 'videos'): string {
  return buildDashboardHref({
    source: target === 'youtube' ? 'youtube' : undefined,
    tab: target === 'youtube' ? tab : undefined,
  });
}

export function buildDateHref(source: DashboardSource, date: string, tab?: YouTubeTab): string {
  return buildDashboardHref({ source, date, tab });
}
