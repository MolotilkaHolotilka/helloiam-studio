const API_BASE = '/ideas/api';

export function dashboardApiPath(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
