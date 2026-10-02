'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FolderPlus, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createProjectAction } from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CreateProjectButton() {
  const locale = useLocale();
  const ar = locale === 'ar';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('TEAM');
  const [keyEdited, setKeyEdited] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const projectName = String(form.get('name') || '').trim();
    const key = String(form.get('key') || '').trim().toUpperCase();
    const description = String(form.get('description') || '').trim();
    if (projectName.length < 2) { setError(ar ? 'اسم المشروع يجب أن يحتوي على حرفين على الأقل.' : 'Project name must be at least 2 characters.'); return; }
    if (!/^[A-Z0-9]{2,10}$/.test(key)) { setError(ar ? 'استخدم حرفين إلى 10 أحرف أو أرقام لمعرّف المشروع.' : 'Use 2–10 letters or numbers for the project key.'); return; }
    setError('');
    startTransition(async () => {
      const result = await createProjectAction({ name: projectName, key, description });
      if (!result.success || !result.projectId) setError(result.error || (ar ? 'تعذر إنشاء المشروع.' : 'Could not create the project.'));
      else {
        toast.success(ar ? 'تم إنشاء المشروع' : 'Project created');
        setOpen(false);
        router.push(`/${locale}/projects/${result.projectId}/overview`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); if (!next) setError(''); } }}>
      <DialogTrigger asChild><Button className="gap-2 rounded-lg shadow-sm"><Plus size={16} />{ar ? 'مشروع جديد' : 'New project'}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-1 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary sm:mx-0"><FolderPlus size={21} /></div>
          <DialogTitle>{ar ? 'إنشاء مشروع' : 'Create a project'}</DialogTitle>
          <DialogDescription>{ar ? 'أنشئ مساحة واضحة لتنظيم العمل ومتابعة تقدّم الفريق.' : 'Create a focused space to organize work and track your team’s progress.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2"><Label htmlFor="project-name">{ar ? 'اسم المشروع' : 'Project name'}</Label><Input id="project-name" name="name" value={name} onChange={(event) => { const nextName = event.target.value; setName(nextName); if (!keyEdited) setProjectKey(nextName.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 5) || 'TEAM'); }} maxLength={80} autoFocus required placeholder={ar ? 'مثال: إطلاق الموقع' : 'e.g. Website launch'} /></div>
          <div className="space-y-2"><Label htmlFor="project-key">{ar ? 'رمز المشروع' : 'Project key'}</Label><Input id="project-key" name="key" value={projectKey} onChange={(event) => { setKeyEdited(true); setProjectKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)); }} maxLength={10} required dir="ltr" className="font-mono uppercase" /><p className="text-xs text-muted-foreground">{ar ? 'حرفان إلى 10 أحرف أو أرقام؛ يظهر هذا الرمز بجانب المهام.' : '2–10 letters or numbers. This key appears beside tasks.'}</p></div>
          <div className="space-y-2"><Label htmlFor="project-description">{ar ? 'الوصف (اختياري)' : 'Description (optional)'}</Label><Textarea id="project-description" name="description" maxLength={500} rows={3} placeholder={ar ? 'ما الذي سيعمل عليه الفريق؟' : 'What will your team work on?'} /></div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button type="submit" disabled={pending || name.trim().length < 2} className="gap-2">{pending && <LoaderCircle className="animate-spin" size={16} />}{pending ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'إنشاء المشروع' : 'Create project')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
