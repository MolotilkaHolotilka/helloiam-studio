'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HeaderNav() {
  const pathname = usePathname();
  const isFavorites = pathname.startsWith('/favorites');
  const isSearch = pathname.startsWith('/search');
  const isHome = !isFavorites && !isSearch;

  return (
    <nav className="top-nav__links" aria-label="Основная навигация">
      <Link
        href="/"
        className={`top-nav__link${isHome ? ' top-nav__link--active' : ''}`}
      >
        Главная
      </Link>
      <Link
        href="/favorites"
        className={`top-nav__link${isFavorites ? ' top-nav__link--active' : ''}`}
      >
        Избранное
      </Link>
    </nav>
  );
}
