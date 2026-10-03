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

  function generateKeyFromName(name: string): string {
    // Extract Latin letters and numbers from the name
    const latinChars = name.replace(/[^A-Za-z0-9]+/g, '');
    // If no Latin chars found, use a default prefix
    let generatedKey = latinChars ? latinChars.toUpperCase() : '';
    
    // Ensure it starts with a letter
    if (!generatedKey || !/^[A-Z]/.test(generatedKey)) {
      generatedKey = 'P' + generatedKey;
    }
    
    // Limit to 10 characters
    generatedKey = generatedKey.slice(0, 10);
    
    // Ensure minimum length of 2 characters
    if (generatedKey.length < 2) {
      generatedKey = (generatedKey + 'X').slice(0, 10);
    }
    
    // Final validation - ensure it matches the required format exactly
    // Format: ^[A-Z][A-Z0-9]{1,9}$ (uppercase letter followed by 1-9 alphanumeric = 2-10 total)
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(generatedKey)) {
      // Fallback: use PRJ + random suffix (ensures valid format)
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      generatedKey = 'PRJ' + randomSuffix.slice(0, 7); // PRJ + up to 7 chars = max 10
    }
    
    return generatedKey;
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;
    setName(nextName);
    if (!keyEdited) {
      const newKey = generateKeyFromName(nextName);
      setProjectKey(newKey);
    }
  }

  function handleKeyChange(event: React.ChangeEvent<HTMLInputElement>) {
    setKeyEdited(true);
    // Remove invalid characters and limit to 10 chars
    let cleaned = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    // Ensure it starts with a letter
    if (!cleaned || !/^[A-Z]/.test(cleaned)) {
      cleaned = 'P' + cleaned;
    }
    // Ensure minimum length of 2
    if (cleaned.length < 2) {
      cleaned = (cleaned + 'X').slice(0, 10);
    }
    // Final validation - ensure it matches the required format exactly
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(cleaned)) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      cleaned = 'PRJ' + randomSuffix.slice(0, 7);
    }
    setProjectKey(cleaned);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    // Use validated state values instead of raw form data
    const projectName = name.trim();
    const key = projectKey.trim().toUpperCase();
    const description = (event.currentTarget.elements.namedItem('description') as HTMLTextAreaElement | null)?.value?.trim() || '';
    if (projectName.length < 2) { 
      setError(ar ? 'اسم المشروع يجب أن يحتوي على حرفين على الأقل.' : 'Project name must be at least 2 characters.'); 
      return; 
    }
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) { 
      setError(ar ? 'يجب أن يبدأ الرمز بحرف، ويليه 1-9 أحرف أو أرقام (إجمالي 2-10).' : 'Key must start with a letter, followed by 1-9 letters/numbers (2-10 total).'); 
      return; 
    }
    setError('');
    startTransition(async () => {
      const result = await createProjectAction({ name: projectName, key, description });
      if (!result.success || !result.projectId) {
        setError(result.error || (ar ? 'تعذر إنشاء المشروع.' : 'Could not create the project.'));
      } else {
        toast.success(ar ? 'تم إنشاء المشروع' : 'Project created');
        setOpen(false);
        router.push(`/${locale}/projects/${result.projectId}/overview`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); if (!next) setError(''); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-lg shadow-sm">
          <Plus size={16} />{ar ? 'مشروع جديد' : 'New project'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-1 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary sm:mx-0">
            <FolderPlus size={21} />
          </div>
          <DialogTitle>{ar ? 'إنشاء مشروع' : 'Create a project'}</DialogTitle>
          <DialogDescription>{ar ? 'أنشئ مساحة واضحة لتنظيم العمل ومتابعة تقدّم الفريق.' : 'Create a focused space to organize work and track your team\'s progress.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="project-name">{ar ? 'اسم المشروع' : 'Project name'}</Label>
            <Input
              id="project-name"
              name="name"
              value={name}
              onChange={handleNameChange}
              maxLength={80}
              autoFocus
              required
              placeholder={ar ? 'مثال: إطلاق الموقع' : 'e.g. Website launch'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-key">{ar ? 'رمز المشروع' : 'Project key'}</Label>
            <Input
              id="project-key"
              name="key"
              value={projectKey}
              onChange={handleKeyChange}
              maxLength={10}
              required
              dir="ltr"
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">
              {ar ? 'يجب أن يبدأ بحرف، ويليه 1-9 أحرف أو أرقام (إجمالي 2-10).' : 'Must start with a letter, followed by 1-9 letters/numbers (2-10 total).'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">{ar ? 'الوصف (اختياري)' : 'Description (optional)'}</Label>
            <Textarea
              id="project-description"
              name="description"
              maxLength={500}
              rows={3}
              placeholder={ar ? 'ما الذي سيعمل عليه الفريق؟' : 'What will your team work on?'}
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              {ar ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={pending || name.trim().length < 2} className="gap-2">
              {pending && <LoaderCircle className="animate-spin" size={16} />}
              {pending ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'إنشاء المشروع' : 'Create project')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}