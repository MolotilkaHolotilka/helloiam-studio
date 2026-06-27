import Link from 'next/link';
import {
  buildDashboardHref,
  buildSourceSwitchHref,
  type DashboardSource,
  type YouTubeTab,
} from '@/lib/dashboard-url';
import { DATA_SOURCES } from '@/lib/sources';
import type { YouTubeVideoSortKey } from '@/lib/youtube-sort';

interface SourceSwitcherProps {
  activeSource: DashboardSource;
  date?: string;
  tag?: string;
  tab?: YouTubeTab;
  trendTag?: string;
  rubric?: string;
  sort?: YouTubeVideoSortKey;
}

export function SourceSwitcher({
  activeSource,
  date,
  tag,
  tab,
  trendTag,
  rubric,
  sort,
}: SourceSwitcherProps) {
  return (
    <section className="source-bar" aria-label="Раздел">
      <div className="segmented-control source-bar__list" role="tablist">
        {DATA_SOURCES.map((source) => {
          const sourceId = source.id as DashboardSource;
          const isActive = sourceId === activeSource;

          const href = isActive
            ? buildDashboardHref({
                source: sourceId,
                date,
                tag: sourceId === 'youtube' && tab !== 'trends' ? tag : undefined,
                tab: sourceId === 'youtube' ? tab : undefined,
                trendTag: sourceId === 'youtube' && tab === 'trends' ? trendTag : undefined,
                rubric: sourceId === 'exa' ? rubric : undefined,
                sort: sourceId === 'youtube' && tab !== 'trends' ? sort : undefined,
              })
            : buildSourceSwitchHref(sourceId, tab ?? 'videos');

          return (
            <Link
              key={source.id}
              href={href}
              className={`segmented-control__item${isActive ? ' segmented-control__item--active' : ''}`}
              title={source.description}
              scroll={false}
              prefetch={false}
              role="tab"
              aria-selected={isActive}
            >
              <span className="segmented-control__dot" aria-hidden />
              <span>{source.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
