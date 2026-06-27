import { redirect } from 'next/navigation';

interface DatePageProps {
  params: Promise<{ date: string }>;
}

export default async function DatePage({ params }: DatePageProps) {
  const { date } = await params;
  redirect(`/?date=${date}`);
}
