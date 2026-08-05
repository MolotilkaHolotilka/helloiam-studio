import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FavoriteButton } from '@/components/FavoriteButton';
import { formatDateLabel, formatShortDate, getNewsDateHref, getNewsItem } from '@/lib/news-service';
import { isFavorite } from '@/lib/favorites';
import { hasExtendedContent, splitParagraphs } from '@/lib/text-utils';

export const dynamic = 'force-dynamic';

interface NewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { id } = await params;
  const result = getNewsItem(id);

  if (!result) notFound();

  const { item, date } = result;
  const showFull = hasExtendedContent(item.summary, item.fullSummary);
  const fullParagraphs = showFull ? splitParagraphs(item.fullSummary) : [];

  return (
    <article className="page">
      <div className="article-back">
        <Link href={getNewsDateHref(date)} className="body-sm">
          ← {formatDateLabel(date)}
        </Link>
      </div>

      <div className="article-column">
        <div className="article-hero__toolbar">
          <div className="product-card__metrics article-hero__metrics">
            <span className="metric-pill metric-pill--hot">{item.importanceScore}/10</span>
            {item.faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.faviconUrl} alt="" className="metric-icon" width={16} height={16} />
            )}
            <span className="caption metric-label">{item.sourceName}</span>
            <span className="caption metric-label">{formatShortDate(item.publishedAt)}</span>
            <span className="category-chip">{item.categoryEmoji} {item.categoryLabel}</span>
          </div>
          <div className="article-hero__actions">
            <FavoriteButton
              type="news"
              itemId={item.id}
              initialFavorite={isFavorite('news', item.id)}
              className="favorite-btn--toolbar"
            />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="body-sm article-source-link-top"
            >
              Читать у источника
            </a>
          </div>
        </div>

        <h1 className="headline article-hero__title">{item.title}</h1>

        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="article-hero__image" />
        ) : (
          <div className="article-hero__image article-hero__image--placeholder">
            {item.categoryEmoji || '📰'}
          </div>
        )}

        <div className="article-body">
          <p className="article-lead">{item.summary}</p>

          {showFull && (
            <section className="article-full">
              <h2 className="technical-label">Полная версия</h2>
              {fullParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
