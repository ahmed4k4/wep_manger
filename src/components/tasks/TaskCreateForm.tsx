'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createTaskAction } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectMemberWithProfile, TaskPriority, TaskStatus } from '@/types/project';

const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'];

export function TaskCreateForm({ projectId, members, initialStatus }: { projectId: string; members: ProjectMemberWithProfile[]; initialStatus?: string }) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [status, setStatus] = useState<TaskStatus>(validStatuses.includes(initialStatus as TaskStatus) ? initialStatus as TaskStatus : 'TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assignee, setAssignee] = useState('unassigned');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const description = String(form.get('description') || '').trim();
    const startDate = String(form.get('start_date') || '');
    const dueDate = String(form.get('due_date') || '');
    if (title.length < 2) { setError(ar ? 'اكتب عنوانًا من حرفين على الأقل.' : 'Enter a title with at least 2 characters.'); return; }
    if (startDate && dueDate && dueDate < startDate) { setError(ar ? 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ البدء.' : 'The due date must be on or after the start date.'); return; }
    setError('');
    startTransition(async () => {
      const result = await createTaskAction({ project_id: projectId, title, description, status, priority, assignee_id: assignee === 'unassigned' ? undefined : assignee, start_date: startDate || undefined, due_date: dueDate || undefined });
      if (!result.success) { setError(result.error || (ar ? 'تعذر إنشاء المهمة.' : 'Could not create the task.')); return; }
      toast.success(ar ? 'تم إنشاء المهمة' : 'Task created');
      router.push(`/${locale}/projects/${projectId}/tasks`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/${locale}/projects/${projectId}/tasks`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} className={ar ? 'rotate-180' : ''} />{ar ? 'العودة إلى المهام' : 'Back to tasks'}</Link>
      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-gradient-to-br from-primary/8 via-transparent to-transparent px-6 py-6 sm:px-8">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plus size={19} /></div>
          <CardTitle className="text-2xl">{ar ? 'مهمة جديدة' : 'Create a task'}</CardTitle>
          <CardDescription>{ar ? 'أضف العمل المطلوب وحدد الأولوية والمسؤول.' : 'Describe the work and set its priority and owner.'}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8">
          <form onSubmit={submit} noValidate className="space-y-5">
            <div className="space-y-2"><Label htmlFor="task-title">{ar ? 'عنوان المهمة' : 'Task title'} *</Label><Input id="task-title" name="title" required maxLength={160} autoFocus placeholder={ar ? 'مثال: مراجعة التصميم' : 'e.g. Review the design'} /></div>
            <div className="space-y-2"><Label htmlFor="task-description">{ar ? 'الوصف' : 'Description'}</Label><Textarea id="task-description" name="description" rows={5} maxLength={5000} placeholder={ar ? 'أضف تفاصيل تساعد الفريق على إنجاز المهمة.' : 'Add details that will help your team complete the task.'} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>{ar ? 'الحالة' : 'Status'}</Label><Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{validStatuses.map((value) => <SelectItem key={value} value={value}>{({TODO:ar?'قيد الانتظار':'To do',IN_PROGRESS:ar?'قيد التنفيذ':'In progress',REVIEW:ar?'مراجعة':'Review',BLOCKED:ar?'محظورة':'Blocked',COMPLETED:ar?'مكتملة':'Completed'})[value]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{ar ? 'الأولوية' : 'Priority'}</Label><Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(['LOW','MEDIUM','HIGH','URGENT'] as TaskPriority[]).map((value) => <SelectItem key={value} value={value}>{({LOW:ar?'منخفضة':'Low',MEDIUM:ar?'متوسطة':'Medium',HIGH:ar?'مرتفعة':'High',URGENT:ar?'عاجلة':'Urgent'})[value]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{ar ? 'المسؤول' : 'Assignee'}</Label><Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue placeholder={ar ? 'اختر عضوًا' : 'Select a member'} /></SelectTrigger><SelectContent><SelectItem value="unassigned">{ar ? 'غير معيّنة' : 'Unassigned'}</SelectItem>{members.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="task-start-date">{ar ? 'تاريخ البدء' : 'Start date'}</Label><Input id="task-start-date" name="start_date" type="date" /></div>
              <div className="space-y-2"><Label htmlFor="task-due-date">{ar ? 'تاريخ الاستحقاق' : 'Due date'}</Label><Input id="task-due-date" name="due_date" type="date" /></div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={pending} onClick={() => router.back()}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button type="submit" disabled={pending} className="gap-2">{pending && <LoaderCircle size={16} className="animate-spin" />}{pending ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'إنشاء المهمة' : 'Create task')}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
