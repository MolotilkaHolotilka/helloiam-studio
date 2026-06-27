import 'dotenv/config';
import { collectArmeniaNews } from '../lib/collector.ts';

async function main() {
  try {
    const news = await collectArmeniaNews();
    console.log(JSON.stringify(news, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
