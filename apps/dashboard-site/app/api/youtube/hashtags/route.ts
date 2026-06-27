import { NextResponse } from 'next/server';
import {
  addHashtag,
  getHashtagConfig,
  removeHashtag,
  setHashtagEnabled,
  toggleHashtag,
} from '@/lib/youtube-hashtag-config';
import { setTrendsTagEnabled } from '@/lib/youtube-trends-tracking';

export const runtime = 'nodejs';

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase();
}

function syncTrendsTag(tag: string, enabled: boolean) {
  setTrendsTagEnabled(normalizeTag(tag), enabled);
}

export async function GET() {
  return NextResponse.json(getHashtagConfig());
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: string;
      tag?: string;
      enabled?: boolean;
    };
    const { action, tag, enabled } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    let config;
    switch (action) {
      case 'setEnabled':
        if (typeof enabled !== 'boolean') {
          return NextResponse.json({ error: 'enabled is required' }, { status: 400 });
        }
        config = setHashtagEnabled(tag, enabled);
        syncTrendsTag(tag, enabled);
        break;
      case 'toggle':
        config = toggleHashtag(tag);
        {
          const entry = config.tags.find((item) => item.tag === normalizeTag(tag));
          syncTrendsTag(tag, entry?.enabled ?? true);
        }
        break;
      case 'add':
        config = addHashtag(tag);
        syncTrendsTag(tag, true);
        break;
      case 'remove':
        config = removeHashtag(tag);
        syncTrendsTag(tag, false);
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hashtag update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
