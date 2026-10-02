import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';


export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/projects`);
  return <>{children}</>;
}
