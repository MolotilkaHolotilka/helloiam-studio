'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { formatHashtag } from '@/lib/youtube-trends-chart';
import type { YouTubeVideoSortKey } from '@/lib/youtube-sort';

interface YouTubeHashtagNavProps {
  tags: { tag: string; count: number }[];
  configuredTags: string[];
  activeTag?: string;
  date?: string;
  sort?: YouTubeVideoSortKey;
}

const VISIBLE_OTHERS = 5;

export function YouTubeHashtagNav({
  tags,
  configuredTags,
  activeTag,
  date,
  sort,
}: YouTubeHashtagNavProps) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const configuredSet = new Set(configuredTags.map((tag) => tag.toLowerCase()));
  const configured = tags.filter((item) => configuredSet.has(item.tag));
  const others = tags.filter((item) => !configuredSet.has(item.tag));
  const visibleOthers = expanded ? others : others.slice(0, VISIBLE_OTHERS);
  const hiddenCount = Math.max(0, others.length - VISIBLE_OTHERS);
  const displayTags = [...configured, ...visibleOthers];

  return (
    <nav className="hashtag-nav" aria-label="Фильтр по хештегам">
      <p className="technical-label hashtag-nav__label">Быстрый фильтр</p>
      <div className="hashtag-nav__list">
        <Link
          href={buildDashboardHref({ source: 'youtube', date, tab: 'videos', sort })}
          className={`date-chip${!activeTag ? ' date-chip--active' : ''}`}
          scroll={false}
          prefetch={false}
        >
          Все
        </Link>
        {displayTags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={buildDashboardHref({ source: 'youtube', date, tag, tab: 'videos', sort })}
            className={`date-chip${activeTag === tag ? ' date-chip--active' : ''}`}
            scroll={false}
            prefetch={false}
          >
            {formatHashtag(tag)} ({count})
          </Link>
        ))}
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            className="date-chip date-chip--more"
            onClick={() => setExpanded(true)}
          >
            Ещё {hiddenCount}
          </button>
        )}
      </div>
    </nav>
  );
}
