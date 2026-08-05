export type SourceStatus = 'active' | 'coming_soon';

export interface DataSource {
  id: string;
  name: string;
  status: SourceStatus;
  description?: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'exa',
    name: 'Новости',
    status: 'active',
    description: 'Подборка новостей и материалов для постов',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    status: 'active',
    description: 'Видео, тренды и хештеги',
  },
];

export function getSourceById(id: string) {
  return DATA_SOURCES.find((s) => s.id === id);
}
