import { NextResponse } from 'next/server';
import {
  createAuthCookieValue,
  getAuthCookieSecure,
  isPasswordCorrect,
  isSitePasswordEnabled,
  SITE_AUTH_COOKIE,
} from '@/lib/site-auth';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSitePasswordEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isPasswordCorrect(password)) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_AUTH_COOKIE, await createAuthCookieValue(), {
    httpOnly: true,
    secure: getAuthCookieSecure(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
