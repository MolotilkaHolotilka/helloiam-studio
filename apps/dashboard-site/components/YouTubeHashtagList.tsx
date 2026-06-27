import { formatHashtag } from '@/lib/youtube-trends-chart';

interface YouTubeHashtagListProps {
  tags: string[];
  label?: string;
}

export function YouTubeHashtagList({ tags, label = 'Хештеги' }: YouTubeHashtagListProps) {
  if (tags.length === 0) return null;

  return (
    <section className="youtube-hashtags-block" aria-label={label}>
      <p className="technical-label youtube-hashtags-block__label">{label}</p>
      <div className="youtube-hashtags-block__list">
        {tags.map((tag) => (
          <span key={tag} className="youtube-hashtag-chip">
            {formatHashtag(tag)}
          </span>
        ))}
      </div>
    </section>
  );
}
