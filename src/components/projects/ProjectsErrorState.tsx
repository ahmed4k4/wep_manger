'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ProjectsErrorState() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ar = locale === 'ar';
  return (
    <Card role="alert" className="mx-auto max-w-xl border-destructive/20">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertCircle size={22} /></div>
        <h2 className="text-lg font-semibold">{ar ? 'تعذر تحميل المشاريع' : 'We couldn’t load your projects'}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{ar ? 'تعذّر التحقق من جلستك أو الاتصال بالخدمة. حدّث الصفحة وحاول مرة أخرى.' : 'Your session could not be verified or the service is temporarily unavailable. Refresh and try again.'}</p>
        <Button className="mt-5 gap-2" variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={15} className={pending ? 'animate-spin' : ''} />{ar ? 'إعادة المحاولة' : 'Try again'}</Button>
      </CardContent>
    </Card>
  );
}
