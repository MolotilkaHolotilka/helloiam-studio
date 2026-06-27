import type { ReactNode } from 'react';
import { FilterSortToolbar } from '@/components/controls/FilterSortToolbar';
import { FiltersDropdown, type FilterDropdownOption } from '@/components/controls/FiltersDropdown';
import { SortDropdown } from '@/components/controls/SortDropdown';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { formatHashtag } from '@/lib/youtube-trends-chart';
import {
  YOUTUBE_VIDEO_SORT_MENU_LABELS,
  YOUTUBE_VIDEO_SORT_OPTIONS,
  type YouTubeVideoSortKey,
} from '@/lib/youtube-sort';

interface YouTubeVideosControlsProps {
  tags: { tag: string; count: number }[];
  activeTag?: string;
  activeSort: YouTubeVideoSortKey;
  date?: string;
  dateNav?: ReactNode;
}

export function YouTubeVideosControls({
  tags,
  activeTag,
  activeSort,
  date,
  dateNav,
}: YouTubeVideosControlsProps) {
  const sortOptions = YOUTUBE_VIDEO_SORT_OPTIONS.map((key) => ({
    id: key,
    label: YOUTUBE_VIDEO_SORT_MENU_LABELS[key],
    href: buildDashboardHref({
      source: 'youtube',
      date,
      tag: activeTag,
      tab: 'videos',
      sort: key,
    }),
  }));

  const filterOptions: FilterDropdownOption[] = [
    {
      id: 'all',
      label: 'Все',
      href: buildDashboardHref({ source: 'youtube', date, tab: 'videos', sort: activeSort }),
      active: !activeTag,
    },
    ...tags.map(({ tag, count }) => ({
      id: tag,
      label: `${formatHashtag(tag)} (${count})`,
      href: buildDashboardHref({
        source: 'youtube',
        date,
        tag,
        tab: 'videos',
        sort: activeSort,
      }),
      active: activeTag === tag,
    })),
  ];

  return (
    <FilterSortToolbar startAction={dateNav}>
      <SortDropdown activeId={activeSort} options={sortOptions} ariaLabel="Сортировка видео" />
      {tags.length > 0 && (
        <FiltersDropdown options={filterOptions} ariaLabel="Фильтр по хештегам" />
      )}
    </FilterSortToolbar>
  );
}
