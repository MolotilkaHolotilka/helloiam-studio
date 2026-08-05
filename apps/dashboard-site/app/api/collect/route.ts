import { NextResponse } from 'next/server';
import { formatApiErrorForUser } from '@/lib/api-errors';
import { runDailyCollection } from '@/lib/news-service';

export const runtime = 'nodejs';

function collectErrorCode(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('exa') && (lower.includes('403') || lower.includes('blocked'))) {
    return 'exa';
  }
  return 'unknown';
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const force = url.searchParams.get('force') === '1';
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false;

  try {
    const collection = await runDailyCollection(force);
    if (wantsJson) return NextResponse.json(collection);
    return NextResponse.redirect(new URL('/', origin), 303);
  } catch (error) {
    const message = formatApiErrorForUser(
      error instanceof Error ? error.message : 'Collection failed',
    );
    if (wantsJson) return NextResponse.json({ error: message }, { status: 500 });
    const redirectUrl = new URL('/', origin);
    redirectUrl.searchParams.set('collectError', collectErrorCode(message));
    redirectUrl.searchParams.set('errorMessage', message);
    redirectUrl.searchParams.set('source', 'exa');
    return NextResponse.redirect(redirectUrl, 303);
  }
}

export async function GET() {
  try {
    const collection = await runDailyCollection(true);
    return NextResponse.json(collection);
  } catch (error) {
    const message = formatApiErrorForUser(
      error instanceof Error ? error.message : 'Collection failed',
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
