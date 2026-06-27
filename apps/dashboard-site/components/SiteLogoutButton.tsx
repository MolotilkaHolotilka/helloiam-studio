'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { dashboardApiPath } from '@/lib/client-api';

export function SiteLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(dashboardApiPath('/auth/logout'), { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="header-logout"
      onClick={() => void handleLogout()}
      disabled={loading}
    >
      {loading ? '…' : 'Выйти'}
    </button>
  );
}
