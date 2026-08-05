import Link from 'next/link';
import { DateCalendarPicker } from '@/components/DateCalendarPicker';
import { buildDashboardHref, type YouTubeTab } from '@/lib/dashboard-url';
import { formatDateChipLabel, getRecentDates, sortDatesDesc } from '@/lib/date-nav';
import { getTodayDate } from '@/lib/news-service';
import type { YouTubeVideoSortKey } from '@/lib/youtube-sort';

interface DateNavProps {
  activeDate: string;
  dates: string[];
  source?: 'exa' | 'youtube';
  tag?: string;
  tab?: YouTubeTab;
  trendTag?: string;
  rubric?: string;
  sort?: YouTubeVideoSortKey;
}

export function DateNav({
  activeDate,
  dates,
  source = 'exa',
  tag,
  tab,
  trendTag,
  rubric,
  sort,
}: DateNavProps) {
  const today = getTodayDate();
  const availableDates = sortDatesDesc(dates);
  const recentDates = getRecentDates(availableDates, 3);
  const calendarDates = availableDates.map((date) => ({
    date,
    href: hrefForDate(date),
  }));

  if (availableDates.length === 0) return null;

  function hrefForDate(date: string) {
    return buildDashboardHref({
      source: source === 'youtube' ? 'youtube' : undefined,
      date: date === today ? undefined : date,
      tag: source === 'youtube' && tab !== 'trends' ? tag : undefined,
      tab: source === 'youtube' ? tab : undefined,
      trendTag: source === 'youtube' && tab === 'trends' ? trendTag : undefined,
      rubric: source === 'exa' ? rubric : undefined,
      sort: source === 'youtube' && tab !== 'trends' ? sort : undefined,
    });
  }

  const chipDates = recentDates.includes(activeDate)
    ? recentDates
    : [activeDate, ...recentDates.filter((date) => date !== activeDate)].slice(0, 3);

  return (
    <div className="date-nav">
      {chipDates.map((date) => (
        <Link
          key={date}
          href={hrefForDate(date)}
          className={`date-chip${date === activeDate ? ' date-chip--active' : ''}`}
          scroll={false}
          prefetch={false}
        >
          {formatDateChipLabel(date)}
          {date === today && (
            <span className="date-chip__today">сегодня</span>
          )}
        </Link>
      ))}

      {availableDates.length > 3 && (
        <DateCalendarPicker
          availableDates={calendarDates}
          activeDate={activeDate}
          today={today}
        />
      )}
    </div>
  );
}
