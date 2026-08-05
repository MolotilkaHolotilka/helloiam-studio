'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { dashboardApiPath } from '@/lib/client-api';

interface CollectNowButtonProps {
  endpoint: '/collect' | '/collect-youtube';
  idleLabel: string;
  pendingLabel: string;
  successHref: string;
}

export function CollectNowButton({
  endpoint,
  idleLabel,
  pendingLabel,
  successHref,
}: CollectNowButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  async function collectNow() {
    if (isPending) return;

    setIsPending(true);
    setError('');

    try {
      const response = await fetch(`${dashboardApiPath(endpoint)}?force=1`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось обновить данные');
      }

      const target = new URL(successHref, window.location.origin);
      if (searchParams.get('embed') === '1') target.searchParams.set('embed', '1');
      router.replace(`${target.pathname}${target.search}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось обновить данные');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="collect-now">
      <button
        type="button"
        className="button-primary collect-now__button"
        onClick={collectNow}
        disabled={isPending}
        aria-busy={isPending}
      >
        <span className={`collect-now__icon${isPending ? ' collect-now__icon--spinning' : ''}`} aria-hidden>
          ↻
        </span>
        {isPending ? pendingLabel : idleLabel}
      </button>
      {error && <p className="collect-now__error body-sm" role="alert">{error}</p>}
    </div>
  );
}
