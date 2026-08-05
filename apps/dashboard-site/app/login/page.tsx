import { Suspense } from 'react';
import { SiteLoginForm } from '@/components/SiteLoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="page site-login">
      <div className="site-login__card">
        <p className="technical-label">Армения · Идеи для постов</p>
        <h1 className="headline site-login__title">Вход на сайт</h1>
        <p className="body-sm site-login__hint">Доступ только по паролю</p>
        <Suspense fallback={<p className="subhead">Загрузка…</p>}>
          <SiteLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
