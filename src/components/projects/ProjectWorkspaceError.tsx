/**
 * Project Workspace Error Boundary
 * Displayed when there's an error loading the project workspace
 */

'use client';

import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ProjectWorkspaceErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  projectId: string;
}

export function ProjectWorkspaceError({ error, reset, projectId }: ProjectWorkspaceErrorProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const labels = {
    error: { ar: 'حدث خطأ', en: 'Something went wrong' },
    failedToLoad: { ar: 'تعذر تحميل المشروع', en: 'Failed to load project' },
    retry: { ar: 'إعادة المحاولة', en: 'Try again' },
    goBack: { ar: 'العودة للمشاريع', en: 'Go back to projects' },
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>{labels.error[isArabic ? 'ar' : 'en']}</CardTitle>
          <CardDescription>{labels.failedToLoad[isArabic ? 'ar' : 'en']}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <pre className="whitespace-pre-wrap text-left">{error.message}</pre>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.retry[isArabic ? 'ar' : 'en']}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.history.back()}>
              {labels.goBack[isArabic ? 'ar' : 'en']}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}