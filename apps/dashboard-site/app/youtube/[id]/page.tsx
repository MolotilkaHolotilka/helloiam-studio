import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FavoriteButton } from '@/components/FavoriteButton';
import { YouTubeHashtagList } from '@/components/YouTubeHashtagList';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { isFavorite } from '@/lib/favorites';
import {
  formatYouTubeComments,
  formatYouTubeLikes,
  formatYouTubePublishedAt,
  formatYouTubeViews,
  getMatchedHashtags,
  prepareYouTubeDescription,
} from '@/lib/youtube-display';
import { getEnabledHashtagTags } from '@/lib/youtube-hashtag-config';
import {
  formatDateLabel,
  formatFreshness,
  getYouTubeVideo,
} from '@/lib/youtube-service';

export const dynamic = 'force-dynamic';

interface YouTubeVideoPageProps {
  params: Promise<{ id: string }>;
}

export default async function YouTubeVideoPage({ params }: YouTubeVideoPageProps) {
  const { id } = await params;
  const result = getYouTubeVideo(id);

  if (!result) notFound();

  const { item, date } = result;
  const enabledTags = getEnabledHashtagTags();
  const matchedHashtags = getMatchedHashtags(item, enabledTags);
  const descriptionText = item.description || item.summary;
  const { paragraphs } = prepareYouTubeDescription(descriptionText);
  const displayHashtags = matchedHashtags.length > 0 ? matchedHashtags : item.hashtags.slice(0, 12);

  const statsParts = [
    formatYouTubeViews(item.viewCount),
    formatYouTubeLikes(item.likeCount),
    formatYouTubeComments(item.commentCount),
    formatYouTubePublishedAt(item.publishedAt),
    item.duration ? item.duration : null,
  ].filter(Boolean);

  return (
    <article className="page">
      <div className="article-back">
        <Link href={buildDashboardHref({ source: 'youtube', date })} className="body-sm">
          ← YouTube · {formatDateLabel(date)}
        </Link>
      </div>

      <div className="article-column youtube-watch">
        <div className="article-hero__toolbar">
          <div className="youtube-watch__channel">
            <span className="youtube-watch__channel-name">{item.channelName}</span>
            <span className="caption metric-label">{formatFreshness(item.publishedAt)}</span>
          </div>
          <div className="article-hero__actions">
            <FavoriteButton
              type="youtube"
              itemId={item.id}
              initialFavorite={isFavorite('youtube', item.id)}
              className="favorite-btn--toolbar"
            />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="body-sm article-source-link-top"
            >
              Открыть на YouTube
            </a>
          </div>
        </div>

        <div className="youtube-player-wrap youtube-player-wrap--in-column">
          <iframe
            src={`https://www.youtube.com/embed/${item.videoId}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="youtube-player"
          />
        </div>

        <h1 className="headline youtube-watch__title">{item.title}</h1>

        <p className="youtube-watch__stats">{statsParts.join(' · ')}</p>

        {displayHashtags.length > 0 && (
          <YouTubeHashtagList tags={displayHashtags} label="Хештеги в видео" />
        )}

        {(paragraphs.length > 0 || item.summary) && (
          <div className="article-body youtube-watch__description">
            <h2 className="technical-label youtube-watch__description-label">Описание</h2>
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="youtube-watch__description-p">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="youtube-watch__description-p">{item.summary}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
