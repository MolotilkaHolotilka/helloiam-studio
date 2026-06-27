export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  fullSummary: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  category: string;
  categoryLabel: string;
  categoryEmoji: string;
  sourceName: string;
  dataSource: string;
  importanceScore: number;
  faviconUrl: string;
}

export interface DayCollection {
  date: string;
  collectedAt: string;
  items: NewsItem[];
}

export interface DashboardStats {
  total: number;
  activeSources: number;
  avgImportance: number;
  topCategory: string;
  topCategoryCount: number;
  rubricCount: number;
}
