import Link from 'next/link';
import { buildDashboardHref, type YouTubeTab } from '@/lib/dashboard-url';
import type { YouTubeVideoSortKey } from '@/lib/youtube-sort';

interface YouTubeSubNavProps {
  activeTab: YouTubeTab;
  date?: string;
  tag?: string;
  trendTag?: string;
  sort?: YouTubeVideoSortKey;
}

export function YouTubeSubNav({ activeTab, date, tag, trendTag, sort }: YouTubeSubNavProps) {
  return (
    <nav className="youtube-subnav" aria-label="Раздел YouTube">
      <Link
        href={buildDashboardHref({ source: 'youtube', date, tag, tab: 'videos', sort })}
        className={`youtube-subnav__item${activeTab === 'videos' ? ' youtube-subnav__item--active' : ''}`}
        scroll={false}
        prefetch={false}
      >
        Видео
      </Link>
      <Link
        href={buildDashboardHref({ source: 'youtube', date, tab: 'trends', trendTag })}
        className={`youtube-subnav__item${activeTab === 'trends' ? ' youtube-subnav__item--active' : ''}`}
        scroll={false}
        prefetch={false}
      >
        Тренды
      </Link>
    </nav>
  );
}
