'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { FilterSortToolbar } from '@/components/controls/FilterSortToolbar';
import { FiltersDropdown, type FilterDropdownOption } from '@/components/controls/FiltersDropdown';
import { SortDropdown } from '@/components/controls/SortDropdown';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { formatHashtag, TRENDS_SORT_LABELS } from '@/lib/youtube-trends-chart';
import type { DailyTrendsSnapshot, TrendsSortKey } from '@/lib/youtube-trends-types';

const YouTubeTrendsPanel = dynamic(
  () => import('@/components/YouTubeTrendsPanel').then((mod) => mod.YouTubeTrendsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="empty-state">
        <p className="subhead">Загрузка графиков…</p>
      </div>
    ),
  },
);

interface YouTubeTrendsControlsProps {
  history: DailyTrendsSnapshot[];
  enabledTags: string[];
  focusTag?: string;
  allTags: string[];
}

const TREND_SORT_KEYS = Object.keys(TRENDS_SORT_LABELS) as TrendsSortKey[];

export function YouTubeTrendsControls({
  history,
  enabledTags,
  focusTag,
  allTags,
}: YouTubeTrendsControlsProps) {
  const [sortKey, setSortKey] = useState<TrendsSortKey>('growth');
  const showListTitle = !focusTag;

  const sortOptions = TREND_SORT_KEYS.map((key) => ({
    id: key,
    label: TRENDS_SORT_LABELS[key],
  }));

  const filterOptions: FilterDropdownOption[] = [
    {
      id: 'all',
      label: 'Все',
      href: buildDashboardHref({ source: 'youtube', tab: 'trends' }),
      active: !focusTag,
    },
    ...allTags.map((tag) => ({
      id: tag,
      label: formatHashtag(tag),
      href: buildDashboardHref({ source: 'youtube', tab: 'trends', trendTag: tag }),
      active: focusTag === tag,
    })),
  ];

  return (
    <>
      <FilterSortToolbar
        startAction={
          showListTitle ? (
            <h2 className="headline top-stories__title top-stories__title--inline">Сейчас в тренде</h2>
          ) : undefined
        }
      >
        <SortDropdown
          activeId={sortKey}
          options={sortOptions}
          onSelect={(id) => setSortKey(id as TrendsSortKey)}
          ariaLabel="Сортировка трендов"
        />
        {allTags.length > 0 && (
          <FiltersDropdown options={filterOptions} ariaLabel="Фокус на хештеге" />
        )}
      </FilterSortToolbar>

      <YouTubeTrendsPanel
        history={history}
        enabledTags={enabledTags}
        focusTag={focusTag}
        sortKey={sortKey}
        showHeader={!showListTitle}
      />
    </>
  );
}
