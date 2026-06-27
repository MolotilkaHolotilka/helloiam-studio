import { NextResponse } from 'next/server';
import { getFavoriteIdSet, listFavorites, toggleFavorite } from '@/lib/favorites';
import type { FavoriteType } from '@/lib/favorites-types';

export const runtime = 'nodejs';

function parseFavoriteType(value: unknown): FavoriteType | null {
  return value === 'news' || value === 'youtube' ? value : null;
}

export async function GET() {
  const items = listFavorites();
  const ids = [...getFavoriteIdSet()];

  return NextResponse.json({ items, ids });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      type?: string;
      id?: string;
      action?: string;
    };

    const type = parseFavoriteType(body.type);
    const id = typeof body.id === 'string' ? body.id.trim() : '';

    if (!type || !id) {
      return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
    }

    if (body.action && body.action !== 'toggle') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const favorite = toggleFavorite(type, id);

    return NextResponse.json({
      favorite,
      ids: [...getFavoriteIdSet()],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Favorites update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
