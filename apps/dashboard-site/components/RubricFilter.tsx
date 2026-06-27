import Link from 'next/link';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { RUBRIC_FILTERS, type RubricFilterId } from '@/lib/rubric-filter';

interface RubricFilterProps {
  activeRubric: RubricFilterId;
  date?: string;
}

export function RubricFilter({ activeRubric, date }: RubricFilterProps) {
  return (
    <nav className="rubric-filter" aria-label="Фильтр по рубрикам">
      <p className="technical-label rubric-filter__label">Рубрика</p>
      <div className="rubric-filter__list">
        {RUBRIC_FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={buildDashboardHref({
              source: 'exa',
              date,
              rubric: filter.id === 'all' ? undefined : filter.id,
            })}
            className={`date-chip${activeRubric === filter.id ? ' date-chip--active' : ''}`}
            scroll={false}
            prefetch={false}
          >
            {'emoji' in filter && filter.emoji ? `${filter.emoji} ` : ''}{filter.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
