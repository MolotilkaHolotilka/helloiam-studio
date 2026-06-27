import { redirect } from 'next/navigation';

interface YouTubePageProps {
  searchParams: Promise<{ tag?: string; date?: string }>;
}

export default async function YouTubePage({ searchParams }: YouTubePageProps) {
  const { tag, date } = await searchParams;
  const params = new URLSearchParams({ source: 'youtube' });
  if (date) params.set('date', date);
  if (tag) params.set('tag', tag);
  redirect(`/?${params.toString()}`);
}
