import { formatDateLabel, formatTime } from '@/lib/news-service';

interface DataFreshnessProps {
  date: string;
  collectedAt?: string;
  isStale?: boolean;
  today: string;
  kind: 'news' | 'youtube';
}

export function DataFreshness({ date, collectedAt, isStale, today, kind }: DataFreshnessProps) {
  const label = kind === 'news' ? 'Новости' : 'Видео';

  return (
    <p className="data-freshness body-sm">
      {isStale ? (
        <>
          {label} за сегодня ({formatDateLabel(today)}) ещё не собраны.
          {' '}Показаны данные за {formatDateLabel(date)}
          {collectedAt ? ` · обновлено ${formatTime(collectedAt)}` : ''}.
          {' '}Следующее обновление — в 12:00 по Москве.
        </>
      ) : (
        <>
          Данные за {formatDateLabel(date)}
          {collectedAt ? ` · обновлено ${formatTime(collectedAt)}` : ''}
        </>
      )}
    </p>
  );
}
