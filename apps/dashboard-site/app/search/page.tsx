import { SearchResultsList } from '@/components/SearchResultsList';
import { searchContent } from '@/lib/search-service';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? searchContent(query) : [];

  return (
    <div className="page">
      <div className="page-hero">
        <p className="technical-label">Поиск</p>
        <h1 className="display-lg">
          {query ? `«${query}»` : 'Поиск по сайту'}
        </h1>
        <p className="subhead">
          {query
            ? `${results.length} ${results.length === 1 ? 'результат' : results.length < 5 ? 'результата' : 'результатов'} в новостях и YouTube`
            : 'Введите запрос в строке поиска в шапке'}
        </p>
      </div>

      {query && <SearchResultsList results={results} />}
    </div>
  );
}
