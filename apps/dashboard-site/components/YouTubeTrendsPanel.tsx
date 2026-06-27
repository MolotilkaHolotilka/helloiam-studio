'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildDashboardHref } from '@/lib/dashboard-url';
import {
  buildSingleTagSeries,
  computeViewsDayOverDay,
  formatChartTooltipValue,
  formatHashtag,
  formatTrendDate,
  getTagLatestMetric,
  normalizeSeriesToScale,
  sortTrendTags,
  sumTagMetric,
} from '@/lib/youtube-trends-chart';
import type { DailyTrendsSnapshot, TrendMetric, TrendsSortKey } from '@/lib/youtube-trends-types';
import { TREND_METRIC_LABELS } from '@/lib/youtube-trends-types';

interface YouTubeTrendsPanelProps {
  history: DailyTrendsSnapshot[];
  enabledTags: string[];
  focusTag?: string;
  sortKey: TrendsSortKey;
  showHeader?: boolean;
}

const METRICS: TrendMetric[] = ['newViews', 'newVideos', 'newLikes', 'newComments'];

function GrowthBadge({
  changePercent,
  hasComparison,
}: {
  changePercent: number;
  hasComparison: boolean;
}) {
  if (!hasComparison) {
    return <span className="yt-trends__growth yt-trends__growth--stable">—</span>;
  }
  if (changePercent > 0) {
    return <span className="yt-trends__growth yt-trends__growth--up">+{changePercent}%</span>;
  }
  if (changePercent < 0) {
    return <span className="yt-trends__growth yt-trends__growth--down">{changePercent}%</span>;
  }
  return <span className="yt-trends__growth yt-trends__growth--stable">0%</span>;
}

function Sparkline({ data }: { data: { label: string; value: number; raw: number; date: string }[] }) {
  if (data.length === 0) return null;

  return (
    <div className="yt-trends__sparkline">
      <ResponsiveContainer width="100%" height={56}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent-coral)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendingRow({
  rank,
  tag,
  history,
  periodDays,
  isFocused,
}: {
  rank: number;
  tag: string;
  history: DailyTrendsSnapshot[];
  periodDays: number;
  isFocused: boolean;
}) {
  const direction = useMemo(() => computeViewsDayOverDay(history, tag), [history, tag]);
  const latestViews = getTagLatestMetric(history, tag, 'newViews');
  const periodViews = sumTagMetric(history, tag, 'newViews');
  const sparkline = useMemo(
    () => normalizeSeriesToScale(buildSingleTagSeries(history, tag, 'newViews')),
    [history, tag],
  );
  const hasComparison = direction.average > 0;

  return (
    <article className={`yt-trends__row${isFocused ? ' yt-trends__row--focused' : ''}`}>
      <span className="yt-trends__rank">{rank}</span>

      <div className="yt-trends__main">
        <div className="yt-trends__title-row">
          <Link
            href={buildDashboardHref({ source: 'youtube', tab: 'trends', trendTag: tag })}
            className="yt-trends__tag"
            scroll={false}
            prefetch={false}
          >
            {formatHashtag(tag)}
          </Link>
          {latestViews > 0 && <span className="yt-trends__badge">активен</span>}
        </div>
        <p className="caption yt-trends__volume">
          {formatChartTooltipValue(latestViews)} просм. за день
          {periodDays > 0 && (
            <> · {formatChartTooltipValue(periodViews)} за {periodDays} дн.</>
          )}
        </p>
      </div>

      <div className="yt-trends__stats">
        <GrowthBadge changePercent={direction.changePercent} hasComparison={hasComparison} />
      </div>

      <Sparkline data={sparkline} />
    </article>
  );
}

function TrendExplore({
  tag,
  history,
  relatedTags,
}: {
  tag: string;
  history: DailyTrendsSnapshot[];
  relatedTags: string[];
}) {
  const [metric, setMetric] = useState<TrendMetric>('newViews');
  const series = useMemo(
    () => buildSingleTagSeries(history, tag, metric),
    [history, tag, metric],
  );
  const scaled = useMemo(() => normalizeSeriesToScale(series), [series]);
  const direction = useMemo(() => computeViewsDayOverDay(history, tag), [history, tag]);
  const periodDays = history.length;

  return (
    <div className="yt-trends-explore">
      <header className="yt-trends-explore__header">
        <div>
          <p className="technical-label">Хештег</p>
          <h2 className="headline yt-trends-explore__title">{formatHashtag(tag)}</h2>
          <p className="body-sm yt-trends-explore__meta">
            {periodDays > 0
              ? `Динамика по ${periodDays} дням сбора · шкала 0–100 относительно пика`
              : 'Нет накопленных данных · шкала 0–100 относительно пика'}
          </p>
        </div>
        <Link
          href={buildDashboardHref({ source: 'youtube', tab: 'trends' })}
          className="body-sm"
          scroll={false}
          prefetch={false}
        >
          ← Все тренды
        </Link>
      </header>

      <div className="yt-trends-explore__metrics" role="group" aria-label="Метрика">
        {METRICS.map((item) => (
          <button
            key={item}
            type="button"
            className={`yt-trends-explore__metric${metric === item ? ' yt-trends-explore__metric--active' : ''}`}
            onClick={() => setMetric(item)}
          >
            {TREND_METRIC_LABELS[item]}
          </button>
        ))}
      </div>

      <section className="yt-trends-explore__chart-card">
        <div className="yt-trends-explore__chart-head">
          <h3 className="headline">Интерес во времени</h3>
          <GrowthBadge
            changePercent={direction.changePercent}
            hasComparison={direction.average > 0}
          />
        </div>

        {scaled.length === 0 ? (
          <p className="caption yt-trends-explore__empty">Нет данных по этому хештегу</p>
        ) : (
          <div className="yt-trends-explore__chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scaled} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { date?: string } | undefined;
                    return row?.date ? formatTrendDate(row.date) : '';
                  }}
                  formatter={(value, _name, item) => {
                    const raw = (item?.payload as { raw?: number })?.raw ?? Number(value);
                    return [formatChartTooltipValue(raw), TREND_METRIC_LABELS[metric]];
                  }}
                  contentStyle={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent-coral)"
                  strokeWidth={2.5}
                  dot={scaled.length <= 14 ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {relatedTags.length > 0 && (
        <section className="yt-trends-explore__related">
          <h3 className="headline">Другие хештеги</h3>
          <div className="yt-trends-explore__related-list">
            {relatedTags.map((related) => (
              <Link
                key={related}
                href={buildDashboardHref({ source: 'youtube', tab: 'trends', trendTag: related })}
                className="yt-trends-explore__related-chip"
                scroll={false}
                prefetch={false}
              >
                {formatHashtag(related)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function YouTubeTrendsPanel({ history, enabledTags, focusTag, sortKey, showHeader = true }: YouTubeTrendsPanelProps) {
  const sortedTags = useMemo(
    () => sortTrendTags(enabledTags, history, sortKey),
    [enabledTags, history, sortKey],
  );
  const periodDays = history.length;

  if (enabledTags.length === 0) {
    return (
      <div className="empty-state">
        <p className="subhead">Выберите хештеги для графиков</p>
      </div>
    );
  }

  if (focusTag && enabledTags.includes(focusTag)) {
    const relatedTags = sortedTags.filter((tag) => tag !== focusTag).slice(0, 8);
    return <TrendExplore tag={focusTag} history={history} relatedTags={relatedTags} />;
  }

  return (
    <section className="yt-trends">
      {showHeader && (
        <header className="yt-trends__header">
          <h2 className="headline">Сейчас в тренде</h2>
        </header>
      )}

      <div className="yt-trends__table-head" aria-hidden>
        <span>№</span>
        <span>Хештег</span>
        <span>Рост</span>
        <span>График</span>
      </div>

      <div className="yt-trends__list">
        {sortedTags.map((tag, index) => (
          <TrendingRow
            key={tag}
            rank={index + 1}
            tag={tag}
            history={history}
            periodDays={periodDays}
            isFocused={false}
          />
        ))}
      </div>
    </section>
  );
}
