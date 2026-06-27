import Link from 'next/link';
import { CardCornerActions } from '@/components/CardCornerActions';
import { YouTubeHashtagList } from '@/components/YouTubeHashtagList';
import { buildFavoriteKey } from '@/lib/favorites-types';
import type { YouTubeVideo } from '@/lib/youtube-types';
import {
  formatCount,
  formatFreshness,
} from '@/lib/youtube-service';

interface YouTubeCardProps {
  item: YouTubeVideo;
  favoriteIds?: Set<string>;
}

export function YouTubeCard({ item, favoriteIds }: YouTubeCardProps) {
  const isFavorite = favoriteIds?.has(buildFavoriteKey('youtube', item.id)) ?? false;
  const displayHashtags = item.matchedHashtags?.length
    ? item.matchedHashtags
    : item.hashtags.slice(0, 3);

  return (
    <article className="youtube-card">
      <CardCornerActions
        type="youtube"
        itemId={item.id}
        url={item.url}
        initialFavorite={isFavorite}
      />
      <Link href={`/youtube/${item.id}`} className="youtube-card__thumb-link">
        <div className="youtube-card__thumb-wrap">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="youtube-card__thumb" loading="lazy" />
          ) : (
            <div className="youtube-card__thumb youtube-card__thumb--placeholder">▶</div>
          )}
          {item.duration && (
            <span className="youtube-card__duration">{item.duration}</span>
          )}
        </div>
      </Link>

      <div className="youtube-card__body">
        <div className="youtube-card__metrics">
          <span className="metric-pill" title="Просмотры">
            <span className="metric-pill__key">просм.</span>
            {formatCount(item.viewCount)}
          </span>
          <span className="metric-pill" title="Лайки">
            <span className="metric-pill__key">лайки</span>
            {formatCount(item.likeCount)}
          </span>
          <span className="metric-pill" title="Комментарии">
            <span className="metric-pill__key">ком.</span>
            {formatCount(item.commentCount)}
          </span>
        </div>

        <Link href={`/youtube/${item.id}`}>
          <h2 className="youtube-card__title">{item.title}</h2>
        </Link>
        <p className="youtube-card__summary">{item.summary}</p>

        <div className="youtube-card__footer">
          <div className="youtube-card__meta">
            <span className="caption metric-label">{item.channelName}</span>
            <span className="caption metric-label">{formatFreshness(item.publishedAt)}</span>
          </div>

          {displayHashtags.length > 0 && (
            <YouTubeHashtagList tags={displayHashtags.slice(0, 4)} />
          )}
        </div>
      </div>
    </article>
  );
}
