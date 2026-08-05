export type ContentDateResolution =
  | { status: 'ok'; date: string; isArchive: boolean }
  | { status: 'not_found' };

/** Pick the date to show: freshest by default, explicit archive only when data exists. */
export function resolveContentDate(
  requestedDate: string | undefined,
  today: string,
  hasData: (date: string) => boolean,
  getLatest: () => string | null,
): ContentDateResolution {
  if (requestedDate && requestedDate !== today) {
    if (!hasData(requestedDate)) return { status: 'not_found' };
    return { status: 'ok', date: requestedDate, isArchive: true };
  }

  if (hasData(today)) {
    return { status: 'ok', date: today, isArchive: false };
  }

  const latest = getLatest();
  if (latest) {
    return { status: 'ok', date: latest, isArchive: false };
  }

  return { status: 'ok', date: today, isArchive: false };
}
