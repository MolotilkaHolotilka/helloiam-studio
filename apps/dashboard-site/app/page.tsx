import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DateNav } from '@/components/DateNav';
import { DashboardStats } from '@/components/DashboardStats';
import { NewsFeed } from '@/components/NewsFeed';
import { NewsControls } from '@/components/NewsControls';
import { SourceSwitcher } from '@/components/SourceSwitcher';
import { TopStories } from '@/components/TopStories';
import { YouTubeCard } from '@/components/YouTubeCard';
import { YouTubeHashtagManager } from '@/components/YouTubeHashtagManager';
import { YouTubeStats } from '@/components/YouTubeStats';
import { YouTubeSubNav } from '@/components/YouTubeSubNav';
import { YouTubeTrendsControls } from '@/components/YouTubeTrendsControls';
import { YouTubeVideosControls } from '@/components/YouTubeVideosControls';
import { buildDashboardHref, parseDashboardSource, parseYouTubeTab } from '@/lib/dashboard-url';
import { formatApiErrorForUser } from '@/lib/api-errors';
import { getFavoriteIdSet } from '@/lib/favorites';
import { getPreviousListDate } from '@/lib/stat-delta';
import {
  nextYouTubeFeedLimit,
  parseYouTubeFeedLimit,
  YOUTUBE_FEED_PAGE_SIZE,
} from '@/lib/youtube-feed';
import {
  getTopYouTubeVideosBySort,
  parseYouTubeVideoSort,
  sortYouTubeVideos,
  YOUTUBE_TOP_SECTION_TITLES,
  type YouTubeVideoSortKey,
} from '@/lib/youtube-sort';
import {
  computeDashboardStats,
  filterByRubric,
  formatDateLabel,
  getLatestDate,
  getNewsForDate,
  getTodayDate,
  getTopStories,
  listArchiveDates,
} from '@/lib/news-service';
import { resolveContentDate } from '@/lib/resolve-content-date';
import { parseRubricFilter } from '@/lib/rubric-filter';
import { getEnabledHashtagTags, getHashtagConfig } from '@/lib/youtube-hashtag-config';
import { getTrendsDashboardData } from '@/lib/youtube-trends-service';
import {
  computeYouTubeStats,
  filterByHashtag,
  getTopHashtags,
  getYouTubeForDate,
  getLatestYouTubeDate,
  listYouTubeDates,
} from '@/lib/youtube-service';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    date?: string;
    source?: string;
    tag?: string;
    tab?: string;
    trendTag?: string;
    rubric?: string;
    collectError?: string;
    errorMessage?: string;
    limit?: string;
    sort?: string;
    embed?: string;
  }>;
}

function formatTopicsDateLabel(date: string, today: string): string {
  if (date === today) return 'сегодня';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const {
    date: requestedDate,
    source: sourceParam,
    tag: activeTag,
    tab: tabParam,
    trendTag,
    rubric: rubricParam,
    collectError,
    errorMessage,
    limit: limitParam,
    sort: sortParam,
    embed: embedParam,
  } = await searchParams;
  const embed = embedParam === '1';
  const source = parseDashboardSource(sourceParam);
  const tab = parseYouTubeTab(tabParam);
  const rubric = parseRubricFilter(rubricParam);
  const today = getTodayDate();

  if (source === 'youtube' && tab === 'trends') {
    return renderYouTubeTrendsView(trendTag, collectError, errorMessage, embed);
  }

  if (source === 'youtube') {
    return renderYouTubeVideosView(
      requestedDate,
      today,
      activeTag,
      parseYouTubeFeedLimit(limitParam),
      parseYouTubeVideoSort(sortParam),
      collectError,
      errorMessage,
      embed,
    );
  }

  return renderExaView(requestedDate, today, rubric, collectError, errorMessage, embed);
}

async function renderExaView(
  requestedDate: string | undefined,
  today: string,
  rubric: ReturnType<typeof parseRubricFilter>,
  collectError?: string,
  errorMessage?: string,
  embed = false,
) {
  const resolved = resolveContentDate(
    requestedDate,
    today,
    (date) => Boolean(getNewsForDate(date)),
    getLatestDate,
  );

  if (resolved.status === 'not_found') notFound();

  const { date, isArchive: isArchiveView } = resolved;
  const collection = getNewsForDate(date);

  const allItems = collection?.items ?? [];
  const items = filterByRubric(allItems, rubric === 'all' ? undefined : rubric);
  const stats = computeDashboardStats(items);
  const showTopStories = rubric === 'all' || rubric === 'politics';
  const topStories = showTopStories ? getTopStories(allItems, 5, 'politics') : [];
  const dates = listArchiveDates();
  const prevDate = getPreviousListDate(dates, date);
  const prevCollection = prevDate ? getNewsForDate(prevDate) : null;
  const prevItems = prevCollection
    ? filterByRubric(prevCollection.items, rubric === 'all' ? undefined : rubric)
    : [];
  const prevStats = prevItems.length > 0 ? computeDashboardStats(prevItems) : null;
  const topicsDateLabel = formatTopicsDateLabel(date, today);
  const favoriteIds = getFavoriteIdSet();

  return (
    <div className="page">
      <div className="page-hero">
        <h1 className="display-lg">{formatDateLabel(date)}</h1>
      </div>

      <SourceSwitcher activeSource="exa" date={date} rubric={rubric} />

      {collectError === 'exa' && (
        <div className="stale-banner" role="alert">
          <p className="body-sm">
            {formatApiErrorForUser(errorMessage || 'Не удалось обновить новости')}
          </p>
        </div>
      )}

      <div className="page-toolbar">
        <DateNav activeDate={date} dates={dates} source="exa" rubric={rubric === 'all' ? undefined : rubric} />
      </div>

      {items.length > 0 && (
        <DashboardStats
          stats={stats}
          deltas={{
            total: prevStats ? stats.total - prevStats.total : null,
            avgImportance: prevStats
              ? Math.round((stats.avgImportance - prevStats.avgImportance) * 10) / 10
              : null,
          }}
        />
      )}

      {allItems.length > 0 && (
        <NewsControls
          activeRubric={rubric}
          date={isArchiveView ? date : undefined}
          title={
            items.length > 0 && showTopStories
              ? `Топ новостей ${topicsDateLabel === 'сегодня' ? 'на сегодня' : `за ${topicsDateLabel}`}`
              : undefined
          }
        />
      )}

      {items.length > 0 && showTopStories && (
        <TopStories
          items={topStories}
          dateLabel={topicsDateLabel}
          favoriteIds={favoriteIds}
          showTitle={false}
        />
      )}

      {allItems.length === 0 ? (
        <div className="empty-state">
          <p className="subhead">Новости ещё не собраны</p>
          <p className="body-sm">Обновление каждый день в 12:00 по Москве</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p className="subhead">Нет новостей в выбранной рубрике</p>
          <Link href={buildDashboardHref({ source: 'exa', date: isArchiveView ? date : undefined })} className="button-primary">
            Показать все
          </Link>
        </div>
      ) : (
        <NewsFeed items={items} favoriteIds={favoriteIds} />
      )}
    </div>
  );
}

async function renderYouTubeVideosView(
  requestedDate: string | undefined,
  today: string,
  activeTag?: string,
  feedLimit = YOUTUBE_FEED_PAGE_SIZE,
  activeSort: YouTubeVideoSortKey = 'views',
  collectError?: string,
  errorMessage?: string,
  embed = false,
) {
  const resolved = resolveContentDate(
    requestedDate,
    today,
    (date) => Boolean(getYouTubeForDate(date)),
    getLatestYouTubeDate,
  );

  if (resolved.status === 'not_found') notFound();

  const { date, isArchive: isArchiveView } = resolved;
  const collection = getYouTubeForDate(date);

  const allItems = collection?.items ?? [];
  const filteredItems = filterByHashtag(allItems, activeTag);
  const items = sortYouTubeVideos(filteredItems, activeSort);
  const stats = computeYouTubeStats(items);
  const topVideos = getTopYouTubeVideosBySort(items, activeSort);
  const topVideoIds = new Set(topVideos.map((item) => item.id));
  const feedItems = items.filter((item) => !topVideoIds.has(item.id));
  const hashtagConfig = getHashtagConfig();
  const configuredTags = getEnabledHashtagTags();
  const hashtags = getTopHashtags(allItems, 16, configuredTags);
  const dates = listYouTubeDates();
  const prevDate = getPreviousListDate(dates, date);
  const prevCollection = prevDate ? getYouTubeForDate(prevDate) : null;
  const prevItems = prevCollection
    ? sortYouTubeVideos(filterByHashtag(prevCollection.items, activeTag), activeSort)
    : [];
  const prevStats = prevItems.length > 0 ? computeYouTubeStats(prevItems) : null;
  const feedList = activeTag ? items : feedItems;
  const visibleFeed = feedList.slice(0, feedLimit);
  const remainingFeed = feedList.length - visibleFeed.length;
  const nextLimit = nextYouTubeFeedLimit(feedLimit, feedList.length);
  const favoriteIds = getFavoriteIdSet();

  return (
    <div className="page">
      <div className="page-hero">
        <h1 className="display-lg">{formatDateLabel(date)}</h1>
      </div>

      <SourceSwitcher activeSource="youtube" date={date} tag={activeTag} tab="videos" sort={activeSort} />
      <YouTubeSubNav activeTab="videos" date={date} tag={activeTag} sort={activeSort} />

      {collectError === 'youtube' && (
        <div className="stale-banner" role="alert">
          <p className="body-sm">
            {formatApiErrorForUser(errorMessage || 'Не удалось обновить видео')}
          </p>
        </div>
      )}

      <YouTubeVideosControls
        dateNav={
          <DateNav
            activeDate={date}
            dates={dates}
            source="youtube"
            tag={activeTag}
            tab="videos"
            sort={activeSort}
          />
        }
        tags={hashtags}
        activeTag={activeTag}
        activeSort={activeSort}
        date={isArchiveView ? date : undefined}
      />
      <YouTubeHashtagManager tags={hashtagConfig.tags} />

      {allItems.length > 0 && (
        <>
          <YouTubeStats
            stats={stats}
            deltas={{
              total: prevStats ? stats.total - prevStats.total : null,
              totalViews: prevStats ? stats.totalViews - prevStats.totalViews : null,
              totalLikes: prevStats ? stats.totalLikes - prevStats.totalLikes : null,
              totalComments: prevStats ? stats.totalComments - prevStats.totalComments : null,
            }}
          />
          {topVideos.length > 0 && !activeTag && (
            <section className="top-stories">
              <h2 className="headline top-stories__title">{YOUTUBE_TOP_SECTION_TITLES[activeSort]}</h2>
              <div className="youtube-grid">
                {topVideos.map((item) => (
                  <YouTubeCard key={item.id} item={item} favoriteIds={favoriteIds} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {allItems.length === 0 ? (
        <div className="empty-state">
          <p className="subhead">Видео ещё не собраны</p>
          <p className="body-sm">Поиск по хештегам каждый день в 12:00 по Москве</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p className="subhead">Нет видео с хештегом #{activeTag}</p>
          <Link
            href={buildDashboardHref({ source: 'youtube', date, sort: activeSort })}
            className="button-primary"
          >
            Показать все
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="headline section-title">
            {activeTag ? `#${activeTag}` : 'Все видео'} ({feedList.length})
            {visibleFeed.length < feedList.length && (
              <span className="section-title__meta">
                {' '}· показано {visibleFeed.length}
              </span>
            )}
          </h2>
          <div className="youtube-grid">
            {visibleFeed.map((item) => (
              <YouTubeCard key={item.id} item={item} favoriteIds={favoriteIds} />
            ))}
          </div>
          {remainingFeed > 0 && (
            <div className="feed-more">
              <Link
                href={buildDashboardHref({
                  source: 'youtube',
                  date: isArchiveView ? date : undefined,
                  tag: activeTag,
                  tab: 'videos',
                  sort: activeSort,
                  limit: nextLimit,
                })}
                className="button-secondary feed-more__button"
                scroll={false}
                prefetch={false}
              >
                Показать ещё {Math.min(remainingFeed, nextLimit - feedLimit)} из {remainingFeed}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function renderYouTubeTrendsView(
  trendTag?: string,
  collectError?: string,
  errorMessage?: string,
  embed = false,
) {
  const trends = getTrendsDashboardData();
  const focusTags = trendTag && trends.enabledTags.includes(trendTag)
    ? [trendTag]
    : trends.enabledTags;
  const periodDays = trends.history.length;

  return (
    <div className="page">
      <div className="page-hero">
        <p className="technical-label">YouTube · тренды</p>
        <h1 className="display-lg">
          {trendTag ? `#${trendTag}` : 'Тренды хештегов'}
        </h1>
        <p className="subhead">
          {trendTag
            ? `Динамика хештега по дням сбора${periodDays > 0 ? ` (${periodDays} дн.)` : ''}`
            : 'Популярность хештегов и графики роста — для выбора тем постов'}
        </p>
      </div>

      <SourceSwitcher activeSource="youtube" tab="trends" trendTag={trendTag} />
      <YouTubeSubNav activeTab="trends" trendTag={trendTag} />

      {collectError === 'youtube' && (
        <div className="stale-banner" role="alert">
          <p className="body-sm">
            {formatApiErrorForUser(errorMessage || 'Не удалось обновить данные')}
          </p>
        </div>
      )}

      <YouTubeTrendsControls
        history={trends.history}
        enabledTags={focusTags}
        focusTag={trendTag}
        allTags={trends.enabledTags}
      />

      <div className="page-actions">
        <Link href={buildDashboardHref({ source: 'youtube', tab: 'videos' })} className="body-sm">
          ← К видео
        </Link>
      </div>
    </div>
  );
}
