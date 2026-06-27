import Link from 'next/link';
import { formatDateLabel } from '@/lib/news-service';
import type { SearchResult } from '@/lib/search-service';

interface SearchResultsListProps {
  results: SearchResult[];
}

function ResultBadges({ result }: { result: SearchResult }) {
  return (
    <div className="search-result__badges">
      {result.kind === 'news' ? (
        <span className="search-result__badge search-result__badge--news">
          {result.item.categoryEmoji} {result.item.categoryLabel}
        </span>
      ) : (
        <span className="search-result__badge search-result__badge--youtube">YouTube</span>
      )}
      {result.isFavorite && (
        <span className="search-result__badge search-result__badge--favorite">Избранное</span>
      )}
    </div>
  );
}

export function SearchResultsList({ results }: SearchResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="empty-state">
        <p className="subhead">Ничего не найдено</p>
        <p className="body-sm">Попробуйте другое слово или хештег, например #armenia</p>
      </div>
    );
  }

  return (
    <ol className="search-results">
      {results.map((result) => {
        const href = result.kind === 'news' ? `/news/${result.item.id}` : `/youtube/${result.item.id}`;
        const title = result.item.title;
        const meta = result.kind === 'news'
          ? result.item.sourceName
          : result.item.channelName;

        return (
          <li key={`${result.kind}-${result.item.id}`}>
            <Link href={href} className="search-result">
              <ResultBadges result={result} />
              <h2 className="search-result__title">{title}</h2>
              <p className="caption search-result__meta">
                {meta} · {formatDateLabel(result.date)}
              </p>
              {result.kind === 'youtube' && result.item.hashtags.length > 0 && (
                <p className="caption search-result__tags">
                  {result.item.hashtags.slice(0, 5).map((tag) => `#${tag}`).join(' ')}
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
