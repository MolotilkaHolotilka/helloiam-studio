import { NextResponse } from 'next/server';
import { getAuthCookieSecure, SITE_AUTH_COOKIE } from '@/lib/site-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_AUTH_COOKIE, '', {
    httpOnly: true,
    secure: getAuthCookieSecure(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
