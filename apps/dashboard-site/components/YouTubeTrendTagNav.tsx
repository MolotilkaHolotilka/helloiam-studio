import Link from 'next/link';
import { buildDashboardHref } from '@/lib/dashboard-url';

interface YouTubeTrendTagNavProps {
  tags: string[];
  activeTag?: string;
}

export function YouTubeTrendTagNav({ tags, activeTag }: YouTubeTrendTagNavProps) {
  if (tags.length === 0) return null;

  return (
    <nav className="hashtag-nav" aria-label="Фокус на хештеге">
      <p className="technical-label hashtag-nav__label">Фокус на графике</p>
      <div className="hashtag-nav__list">
        <Link
          href={buildDashboardHref({ source: 'youtube', tab: 'trends' })}
          className={`date-chip${!activeTag ? ' date-chip--active' : ''}`}
          scroll={false}
          prefetch={false}
        >
          Все
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            href={buildDashboardHref({ source: 'youtube', tab: 'trends', trendTag: tag })}
            className={`date-chip${activeTag === tag ? ' date-chip--active' : ''}`}
            scroll={false}
            prefetch={false}
          >
            #{tag}
          </Link>
        ))}
      </div>
    </nav>
  );
}
