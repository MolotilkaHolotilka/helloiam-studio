import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSitePasswordEnabled, SITE_AUTH_COOKIE, verifyAuthCookie } from '@/lib/site-auth';

function isPublicPath(pathname: string) {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get('embed') === '1') {
    const response = NextResponse.next();
    response.headers.set('x-embed-mode', '1');
    return response;
  }
  if (!isSitePasswordEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  const authed = await verifyAuthCookie(token);

  if (pathname === '/login' && authed) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (authed) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
