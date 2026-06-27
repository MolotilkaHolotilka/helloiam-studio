import Link from 'next/link';
import { buildDashboardHref } from '@/lib/dashboard-url';
import {
  YOUTUBE_VIDEO_SORT_LABELS,
  YOUTUBE_VIDEO_SORT_OPTIONS,
  type YouTubeVideoSortKey,
} from '@/lib/youtube-sort';

interface YouTubeVideoSortNavProps {
  activeSort: YouTubeVideoSortKey;
  date?: string;
  tag?: string;
}

export function YouTubeVideoSortNav({ activeSort, date, tag }: YouTubeVideoSortNavProps) {
  return (
    <nav className="trends-sort-bar" aria-label="Сортировка видео">
      <p className="technical-label">Сортировка</p>
      <div className="trends-sort-bar__list">
        {YOUTUBE_VIDEO_SORT_OPTIONS.map((key) => (
          <Link
            key={key}
            href={buildDashboardHref({
              source: 'youtube',
              date,
              tag,
              tab: 'videos',
              sort: key,
            })}
            className={`trends-sort-bar__btn${activeSort === key ? ' trends-sort-bar__btn--active' : ''}`}
            scroll={false}
            prefetch={false}
          >
            {YOUTUBE_VIDEO_SORT_LABELS[key]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
