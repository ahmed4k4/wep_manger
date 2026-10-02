'use client';

import { useLocale } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ar = useLocale() === 'ar';
  return (
    <div role="alert" className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle size={22} /></div>
      <h1 className="text-xl font-semibold">{ar ? 'حدث خطأ غير متوقع' : 'Something went wrong'}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{ar ? 'تعذر إكمال طلبك. حاول مرة أخرى.' : 'We couldn’t complete your request. Please try again.'}</p>
      <Button onClick={reset} className="mt-5 gap-2"><RotateCcw size={15} />{ar ? 'إعادة المحاولة' : 'Try again'}</Button>
    </div>
  );
}
