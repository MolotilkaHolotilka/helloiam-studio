export function getAppTimezone() {
  return process.env.CRON_TZ ?? 'Europe/Moscow';
}

/** Calendar date (YYYY-MM-DD) in app timezone — used for daily collections and UI. */
export function getTodayDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getAppTimezone() }).format(new Date());
}
