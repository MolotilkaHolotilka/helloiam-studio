import { NextResponse } from 'next/server';
import { getTrendsTrackingConfig, setTrendsTagEnabled } from '@/lib/youtube-trends-tracking';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getTrendsTrackingConfig());
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; tag?: string; enabled?: boolean };
    const { action, tag, enabled } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    if (action === 'setEnabled') {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled is required' }, { status: 400 });
      }
      return NextResponse.json(setTrendsTagEnabled(tag, enabled));
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trends tag update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
