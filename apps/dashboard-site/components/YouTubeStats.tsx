import type { YouTubeStats as Stats } from '@/lib/youtube-types';
import { formatCount } from '@/lib/youtube-service';

interface YouTubeStatsProps {
  stats: Stats;
  deltas?: {
    total?: number | null;
    totalViews?: number | null;
    totalLikes?: number | null;
    totalComments?: number | null;
  };
}

function Delta({ value, formatted }: { value: number | null | undefined; formatted?: boolean }) {
  if (value === null || value === undefined) return null;

  const abs = Math.abs(value);
  let label: string;
  if (value === 0) {
    label = 'без изм.';
  } else if (formatted) {
    label = `${value > 0 ? '+' : '−'}${formatCount(abs)}`;
  } else {
    label = value > 0 ? `+${value}` : String(value);
  }

  const tone = value > 0 ? 'up' : value < 0 ? 'down' : '';

  return (
    <span className={`stat-card__delta${tone ? ` stat-card__delta--${tone}` : ''}`}>
      {label} к пред.
    </span>
  );
}

export function YouTubeStats({ stats, deltas }: YouTubeStatsProps) {
  return (
    <section className="stats-grid" aria-label="Сводка YouTube">
      <div className="stat-card">
        <p className="technical-label">Видео</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">{stats.total}</p>
          <Delta value={deltas?.total} />
        </div>
      </div>
      <div className="stat-card">
        <p className="technical-label">Просмотры</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">{formatCount(stats.totalViews)}</p>
          <Delta value={deltas?.totalViews} formatted />
        </div>
      </div>
      <div className="stat-card">
        <p className="technical-label">Лайки</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">{formatCount(stats.totalLikes)}</p>
          <Delta value={deltas?.totalLikes} formatted />
        </div>
      </div>
      <div className="stat-card">
        <p className="technical-label">Комментарии</p>
        <div className="stat-card__value-row">
          <p className="stat-card__value">{formatCount(stats.totalComments)}</p>
          <Delta value={deltas?.totalComments} formatted />
        </div>
      </div>
    </section>
  );
}
