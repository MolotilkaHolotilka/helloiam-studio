'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { dashboardApiPath } from '@/lib/client-api';
import { formatHashtag } from '@/lib/youtube-trends-chart';
import type { TrendsTrackingEntry } from '@/lib/youtube-trends-tracking';

interface YouTubeTrendsTagFilterProps {
  tags: TrendsTrackingEntry[];
}

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0012 15a2 2 0 002.42-2.42M9.88 5.09A10.94 10.94 0 0112 5c5.5 0 9.5 4.5 10 7-.18.64-.47 1.24-.84 1.78M6.11 6.11A10.7 10.7 0 002 12c.5 2.5 4.5 7 10 7 1.78 0 3.44-.46 4.89-1.27"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function YouTubeTrendsTagFilter({ tags }: YouTubeTrendsTagFilterProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(tags);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEntries(tags);
  }, [tags]);

  async function toggleVisibility(tag: string) {
    const entry = entries.find((item) => item.tag === tag);
    if (!entry) return;

    const enabled = !entry.enabled;
    setEntries((prev) => prev.map((item) => (
      item.tag === tag ? { ...item, enabled } : item
    )));

    const response = await fetch(dashboardApiPath('/youtube/trends-tags'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setEnabled', tag, enabled }),
    });

    if (!response.ok) {
      setEntries((prev) => prev.map((item) => (
        item.tag === tag ? { ...item, enabled: !enabled } : item
      )));
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="trends-tag-filter" aria-label="Хештеги">
      <p className="technical-label">Хештеги на графиках</p>
      <div className="trends-tag-filter__list">
        {entries.map((entry) => (
          <button
            key={entry.tag}
            type="button"
            className={`trends-tag-chip${entry.enabled ? ' trends-tag-chip--on' : ' trends-tag-chip--off'}`}
            onClick={() => void toggleVisibility(entry.tag)}
            disabled={isPending}
            aria-label={entry.enabled ? `Скрыть ${formatHashtag(entry.tag)}` : `Показать ${formatHashtag(entry.tag)}`}
          >
            <EyeIcon off={!entry.enabled} />
            <span>{formatHashtag(entry.tag)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
