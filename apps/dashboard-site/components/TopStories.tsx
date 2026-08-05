import { NewsCard } from '@/components/NewsCard';
import type { NewsItem } from '@/lib/types';

interface TopStoriesProps {
  items: NewsItem[];
  dateLabel: string;
  favoriteIds?: Set<string>;
  showTitle?: boolean;
}

export function TopStories({ items, dateLabel, favoriteIds, showTitle = true }: TopStoriesProps) {
  if (items.length === 0) return null;

  return (
    <section className="top-stories">
      {showTitle && (
        <h2 className="headline top-stories__title">
          Топ новостей {dateLabel === 'сегодня' ? 'на сегодня' : `за ${dateLabel}`}
        </h2>
      )}
      <div className="news-grid">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} featured favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}
