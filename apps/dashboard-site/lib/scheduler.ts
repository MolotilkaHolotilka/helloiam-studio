import cron from 'node-cron';
import { runDailyCollection } from './news-service';
import { runYouTubeCollection } from './youtube-service';

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  const timezone = process.env.CRON_TZ ?? 'Europe/Moscow';
  const schedule = process.env.CRON_SCHEDULE ?? '0 12 * * *';

  cron.schedule(
    schedule,
    async () => {
      try {
        await runDailyCollection();
      } catch (error) {
        console.error('[scheduler] News collection failed:', error);
      }
      try {
        await runYouTubeCollection();
      } catch (error) {
        console.error('[scheduler] YouTube collection failed:', error);
      }
    },
    { timezone },
  );

  console.log(`[scheduler] News + YouTube collection scheduled: ${schedule} (${timezone})`);
}
