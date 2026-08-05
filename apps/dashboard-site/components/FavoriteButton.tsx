'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dashboardApiPath } from '@/lib/client-api';

interface FavoriteButtonProps {
  type: 'news' | 'youtube';
  itemId: string;
  initialFavorite?: boolean;
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5l2.86 5.8 6.39.93-4.62 4.51 1.09 6.36L12 17.77l-5.72 3.01 1.09-6.36L2.75 9.23l6.39-.93L12 2.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteButton({
  type,
  itemId,
  initialFavorite = false,
  className = '',
}: FavoriteButtonProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActive(initialFavorite);
  }, [initialFavorite]);

  async function handleToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(dashboardApiPath('/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: itemId, action: 'toggle' }),
      });

      if (!response.ok) {
        throw new Error('toggle failed');
      }

      const data = await response.json() as { favorite?: boolean };
      setActive(Boolean(data.favorite));
      router.refresh();
    } catch {
      setActive(initialFavorite);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`favorite-btn${active ? ' favorite-btn--active' : ''}${className ? ` ${className}` : ''}`}
      onClick={(event) => void handleToggle(event)}
      disabled={loading}
      aria-pressed={active}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={active ? 'Убрать из избранного' : 'В избранное'}
    >
      <StarIcon filled={active} />
    </button>
  );
}
