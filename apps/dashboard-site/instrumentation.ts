export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('dotenv/config');
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
