import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/db/auth-user';


export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/projects`);
  return <>{children}</>;
}
