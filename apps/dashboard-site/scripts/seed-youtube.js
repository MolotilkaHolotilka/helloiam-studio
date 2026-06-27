import 'dotenv/config';
import { runYouTubeCollection } from '../lib/youtube-service.ts';

const force = process.argv.includes('--force');

try {
  const collection = await runYouTubeCollection(force);
  console.log(`Seeded ${collection.items.length} YouTube videos for ${collection.date}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
