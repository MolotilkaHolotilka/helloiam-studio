import { NewsCard } from '@/components/NewsCard';
import { groupItemsByCategory } from '@/lib/news-service';
import type { NewsItem } from '@/lib/types';

interface NewsFeedProps {
  items: NewsItem[];
  favoriteIds?: Set<string>;
}

export function NewsFeed({ items, favoriteIds }: NewsFeedProps) {
  const sections = groupItemsByCategory(items);

  if (sections.length === 0) return null;

  return (
    <div className="news-feed">
      {sections.map((section) => (
        <section key={section.id} className="rubric-section">
          <h2 className="rubric-section__title">
            <span aria-hidden>{section.emoji}</span> {section.label}
          </h2>
          <div className="news-grid">
            {section.items.map((item) => (
              <NewsCard key={item.id} item={item} favoriteIds={favoriteIds} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
