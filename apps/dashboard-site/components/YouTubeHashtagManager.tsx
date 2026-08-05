'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';
import type { HashtagEntry } from '@/lib/youtube-hashtag-config';
import { formatHashtag } from '@/lib/youtube-trends-chart';
import { dashboardApiPath } from '@/lib/client-api';

const STORAGE_KEY = 'hashtag-manager-open';

interface YouTubeHashtagManagerProps {
  tags: HashtagEntry[];
  defaultOpen?: boolean;
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
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function YouTubeHashtagManager({
  tags,
  defaultOpen = false,
}: YouTubeHashtagManagerProps) {
  const panelId = useId();
  const router = useRouter();
  const [entries, setEntries] = useState(tags);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setEntries(tags);
  }, [tags]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setOpen(true);
      if (stored === '0') setOpen(false);
    } catch {
      // ignore
    }
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function postHashtag(body: Record<string, unknown>) {
    const response = await fetch(dashboardApiPath('/youtube/hashtags'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data.error === 'string' ? data.error : 'Не удалось сохранить хештеги');
    }
  }

  async function toggleEye(tag: string) {
    const entry = entries.find((item) => item.tag === tag);
    if (!entry) return;

    const enabled = !entry.enabled;
    setEntries((prev) => prev.map((item) => (
      item.tag === tag ? { ...item, enabled } : item
    )));
    setError('');

    try {
      await postHashtag({ action: 'setEnabled', tag, enabled });
      startTransition(() => router.refresh());
    } catch (err) {
      setEntries((prev) => prev.map((item) => (
        item.tag === tag ? { ...item, enabled: !enabled } : item
      )));
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function removeTag(tag: string) {
    const backup = entries;
    setEntries((prev) => prev.filter((item) => item.tag !== tag));
    setError('');

    try {
      await postHashtag({ action: 'remove', tag });
      startTransition(() => router.refresh());
    } catch (err) {
      setEntries(backup);
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const normalized = newTag.trim().replace(/^#/, '').toLowerCase();
    if (!normalized) return;

    if (entries.some((item) => item.tag === normalized)) {
      setError('Такой хештег уже есть');
      return;
    }

    const draft: HashtagEntry = { tag: normalized, enabled: true, builtin: false };
    setEntries((prev) => [...prev, draft]);
    setNewTag('');
    setError('');

    try {
      await postHashtag({ action: 'add', tag: normalized });
      startTransition(() => router.refresh());
    } catch (err) {
      setEntries((prev) => prev.filter((item) => item.tag !== normalized));
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  const busy = isPending;
  const enabledCount = entries.filter((item) => item.enabled).length;

  return (
    <section className={`hashtag-manager${open ? ' hashtag-manager--open' : ''}`}>
      <button
        type="button"
        className="hashtag-manager__toggle"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="hashtag-manager__toggle-icon" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="hashtag-manager__toggle-text">Хештеги для поиска</span>
        <span className="hashtag-manager__toggle-meta">{enabledCount} активных</span>
      </button>

      <div id={panelId} className="hashtag-manager__panel" hidden={!open}>
        <p className="caption hashtag-manager__hint">
          Поиск по активным хештегам — каждый день в 12:00 по Москве
        </p>

        <div className="hashtag-manager__list">
          {entries.map((entry) => (
            <div
              key={entry.tag}
              className={`hashtag-item${entry.enabled ? '' : ' hashtag-item--off'}`}
            >
              <button
                type="button"
                className="hashtag-item__eye"
                onClick={() => void toggleEye(entry.tag)}
                disabled={busy}
                title={entry.enabled ? 'Временно отключить' : 'Включить снова'}
                aria-label={entry.enabled ? 'Временно отключить' : 'Включить снова'}
              >
                <EyeIcon off={!entry.enabled} />
              </button>
              <span className="hashtag-item__label">{formatHashtag(entry.tag)}</span>
              <button
                type="button"
                className="hashtag-item__remove"
                onClick={() => void removeTag(entry.tag)}
                disabled={busy}
                title="Удалить хештег"
                aria-label="Удалить хештег"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <form className="hashtag-manager__add" onSubmit={handleAdd}>
          <input
            type="text"
            className="hashtag-manager__input"
            placeholder="Добавить #хештег"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            disabled={busy}
          />
          <button type="submit" className="button-secondary" disabled={busy || !newTag.trim()}>
            Добавить
          </button>
        </form>

        {error && <p className="caption hashtag-manager__error">{error}</p>}
      </div>
    </section>
  );
}
