import 'dotenv/config';
import { runDailyCollection } from '../lib/news-service.ts';

try {
  const force = process.argv.includes('--force');
  const collection = await runDailyCollection(force);
  console.log(`Seeded ${collection.items.length} news items for ${collection.date}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
