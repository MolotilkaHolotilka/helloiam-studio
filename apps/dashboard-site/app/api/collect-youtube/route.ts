import { NextResponse } from 'next/server';
import { formatApiErrorForUser } from '@/lib/api-errors';
import { runYouTubeCollection } from '@/lib/youtube-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false;
  try {
    const collection = await runYouTubeCollection(true);
    if (wantsJson) return NextResponse.json(collection);
    const url = new URL(request.url);
    const origin = url.origin;
    return NextResponse.redirect(new URL('/?source=youtube', origin), 303);
  } catch (error) {
    const message = formatApiErrorForUser(
      error instanceof Error ? error.message : 'Collection failed',
    );
    if (wantsJson) return NextResponse.json({ error: message }, { status: 500 });
    const url = new URL(request.url);
    const redirectUrl = new URL('/?source=youtube', url.origin);
    redirectUrl.searchParams.set('collectError', 'youtube');
    redirectUrl.searchParams.set('errorMessage', message);
    return NextResponse.redirect(redirectUrl, 303);
  }
}

export async function GET() {
  try {
    const collection = await runYouTubeCollection(true);
    return NextResponse.json(collection);
  } catch (error) {
    const message = formatApiErrorForUser(
      error instanceof Error ? error.message : 'Collection failed',
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
