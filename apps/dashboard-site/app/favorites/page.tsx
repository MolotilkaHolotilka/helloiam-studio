import { NewsCard } from '@/components/NewsCard';
import { YouTubeCard } from '@/components/YouTubeCard';
import { getResolvedFavorites } from '@/lib/favorites';
import { buildFavoriteKey } from '@/lib/favorites-types';

export const dynamic = 'force-dynamic';

export default function FavoritesPage() {
  const favorites = getResolvedFavorites();
  const favoriteIds = new Set(
    favorites.map((entry) => buildFavoriteKey(entry.type, entry.item.id)),
  );
  const newsItems = favorites.filter((entry) => entry.type === 'news');
  const videoItems = favorites.filter((entry) => entry.type === 'youtube');

  return (
    <div className="page">
      <div className="page-hero">
        <p className="technical-label">Закладки</p>
        <h1 className="display-lg">Избранное</h1>
        <p className="subhead">
          Новости и видео, которые вы отметили — для идей постов и быстрого доступа
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <p className="subhead">Пока ничего не сохранено</p>
          <p className="body-sm">
            Нажмите звёздочку на карточке новости или видео, чтобы добавить сюда
          </p>
        </div>
      ) : (
        <>
          {newsItems.length > 0 && (
            <section className="favorites-section">
              <h2 className="headline section-title">Новости ({newsItems.length})</h2>
              <div className="news-grid">
                {newsItems.map(({ item }) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    favoriteIds={favoriteIds}
                  />
                ))}
              </div>
            </section>
          )}

          {videoItems.length > 0 && (
            <section className="favorites-section">
              <h2 className="headline section-title">YouTube ({videoItems.length})</h2>
              <div className="youtube-grid">
                {videoItems.map(({ item }) => (
                  <YouTubeCard
                    key={item.id}
                    item={item}
                    favoriteIds={favoriteIds}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
