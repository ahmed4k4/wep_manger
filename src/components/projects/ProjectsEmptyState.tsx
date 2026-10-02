/**
 * Projects Empty State
 * Displayed when user has no projects
 */

'use client';

import Link from 'next/link';
import { Plus, FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from 'next-intl';

export function ProjectsEmptyState() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card className="col-span-full border-dashed border-2 border-border">
        <CardContent className="py-16 px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? 'لا توجد مشاريع بعد' : 'No projects yet'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {isArabic
              ? 'ابدأ بإنشاء أول مشروع لك لتنظيم مهامك وفريقك'
              : 'Get started by creating your first project to organize tasks and your team'}
          </p>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              {isArabic ? 'إنشاء مشروع جديد' : 'Create New Project'}
            </Button>
          </Link>
          <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-4 w-4" />
            {isArabic
              ? 'أو استعرض قوالب المشاريع الجاهزة'
              : 'Or browse project templates'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}