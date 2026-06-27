'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { dashboardApiPath } from '@/lib/client-api';

export function SiteLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(dashboardApiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Неверный пароль');
      }

      const from = searchParams.get('from') || '/';
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="site-login__form" onSubmit={handleSubmit}>
      <label className="site-login__label" htmlFor="site-password">
        Пароль
      </label>
      <input
        id="site-password"
        type="password"
        className="site-login__input"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        autoFocus
        disabled={loading}
        placeholder="Введите пароль"
      />
      <button type="submit" className="button-primary site-login__submit" disabled={loading || !password}>
        {loading ? 'Вход…' : 'Войти'}
      </button>
      {error && <p className="caption site-login__error">{error}</p>}
    </form>
  );
}
