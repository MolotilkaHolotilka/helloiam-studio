import { FavoriteButton } from '@/components/FavoriteButton';
import { ShareCopyButton } from '@/components/ShareCopyButton';

interface CardCornerActionsProps {
  type: 'news' | 'youtube';
  itemId: string;
  url: string;
  initialFavorite?: boolean;
}

export function CardCornerActions({
  type,
  itemId,
  url,
  initialFavorite = false,
}: CardCornerActionsProps) {
  return (
    <div className="card-corner-actions">
      <ShareCopyButton url={url} />
      <FavoriteButton type={type} itemId={itemId} initialFavorite={initialFavorite} />
    </div>
  );
}
