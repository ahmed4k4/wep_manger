import { AuthForm } from '@/components/auth/AuthForm';

export default async function LoginPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const fallback = `/${locale}/projects`;
  const requested = query.next || '';
  const returnTo = requested.startsWith(`/${locale}/`) && !requested.startsWith('//') ? requested : fallback;
  return <div className="mx-auto max-w-5xl py-10"><AuthForm returnTo={returnTo} /></div>;
}
