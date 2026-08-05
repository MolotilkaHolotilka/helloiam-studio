import type { DashboardStats as Stats } from '@/lib/types';

interface DashboardStatsProps {
  stats: Stats;
  deltas?: {
    total?: number | null;
    avgImportance?: number | null;
  };
}

function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;

  const label = value === 0
    ? 'без изм.'
    : value > 0
      ? `+${Number.isInteger(value) ? value : value.toFixed(1)}`
      : `${Number.isInteger(value) ? value : value.toFixed(1)}`;

  const tone = value > 0 ? 'up' : value < 0 ? 'down' : '';

  return (
    <span className={`stat-card__delta${tone ? ` stat-card__delta--${tone}` : ''}`}>
      {label} к пред.
    </span>
  );
}

export function DashboardStats({ stats, deltas }: DashboardStatsProps) {
  return (
    <section className="stats-grid" aria-label="Сводка за день">
      <div className="stat-card">
        <p className="technical-label">Новостей</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">{stats.total}</p>
          <Delta value={deltas?.total} />
        </div>
      </div>
      <div className="stat-card">
        <p className="technical-label">Ср. важность</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">
            {stats.avgImportance}
            <span className="stat-card__suffix">/10</span>
          </p>
          <Delta value={deltas?.avgImportance} />
        </div>
      </div>
      <div className="stat-card">
        <p className="technical-label">Топ рубрика</p>
        <p className="stat-card__value stat-card__value--sm">{stats.topCategory}</p>
        <p className="caption stat-card__hint">{stats.topCategoryCount} материалов</p>
      </div>
      <div className="stat-card">
        <p className="technical-label">Рубрик</p>
        <p className="stat-card__value stat-card__value--sm">{stats.rubricCount || '—'}</p>
        <p className="caption stat-card__hint">в подборке</p>
      </div>
    </section>
  );
}
