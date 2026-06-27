import Link from 'next/link';
import { CardCornerActions } from '@/components/CardCornerActions';
import type { NewsItem } from '@/lib/types';
import { buildFavoriteKey } from '@/lib/favorites-types';
import { formatShortDate } from '@/lib/news-service';
import { buildPostAngle } from '@/lib/post-angle';

interface NewsCardProps {
  item: NewsItem;
  featured?: boolean;
  favoriteIds?: Set<string>;
}

export function NewsCard({ item, featured = false, favoriteIds }: NewsCardProps) {
  const isFavorite = favoriteIds?.has(buildFavoriteKey('news', item.id)) ?? false;

  return (
    <article className="product-card">
      <CardCornerActions
        type="news"
        itemId={item.id}
        url={item.url}
        initialFavorite={isFavorite}
      />
      <Link href={`/news/${item.id}`} className="product-card__media-link">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="product-card__image" loading="lazy" />
        ) : (
          <div className="product-card__image product-card__image--placeholder">
            {item.categoryEmoji || '📰'}
          </div>
        )}
      </Link>

      <div className="product-card__body">
        <div className="product-card__metrics">
          <span className="metric-pill" title="Важность">
            <span className="metric-pill__key">важн</span>
            {item.importanceScore}
          </span>
          {item.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.faviconUrl} alt="" className="metric-icon" width={16} height={16} />
          ) : (
            <span className="metric-icon metric-icon--fallback">{item.categoryEmoji}</span>
          )}
          <span className="caption metric-label">{item.sourceName}</span>
          <span className="caption metric-label">{formatShortDate(item.publishedAt)}</span>
        </div>

        <Link href={`/news/${item.id}`}>
          <h2 className="product-card__title">{item.title}</h2>
        </Link>

        {featured && <p className="product-card__angle">{buildPostAngle(item)}</p>}
        <p className="product-card__summary">{item.summary}</p>
      </div>
    </article>
  );
}
