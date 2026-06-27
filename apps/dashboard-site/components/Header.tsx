import { HeaderNav } from '@/components/HeaderNav';
import { HeaderSearch } from '@/components/HeaderSearch';
import { SiteLogoutButton } from '@/components/SiteLogoutButton';
import { isSitePasswordEnabled } from '@/lib/site-auth';
import Link from 'next/link';
import { Suspense } from 'react';

export function Header() {
  const showLogout = isSitePasswordEnabled();

  return (
    <header className="top-nav">
      <div className="page top-nav__inner">
        <Link href="/" className="top-nav__brand">
          <span className="top-nav__mark" aria-hidden />
          <span className="body-sm top-nav__title">Армения · Контент</span>
        </Link>

        <Suspense fallback={<div className="header-search header-search--placeholder" aria-hidden />}>
          <HeaderSearch />
        </Suspense>

        <div className="top-nav__actions">
          <HeaderNav />
          {showLogout && <SiteLogoutButton />}
        </div>
      </div>
    </header>
  );
}
