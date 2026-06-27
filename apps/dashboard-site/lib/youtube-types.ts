export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  summary: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  importanceScore: number;
  duration: string;
  hashtags: string[];
  matchedHashtags?: string[];
}

export interface YouTubeDayCollection {
  date: string;
  collectedAt: string;
  items: YouTubeVideo[];
}

export interface YouTubeStats {
  total: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  topChannel: string;
}
