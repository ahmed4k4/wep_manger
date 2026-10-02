import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { CommentSection } from '@/components/comments/CommentSection';
import { TaskAttachmentsPanel } from '@/components/tasks/TaskAttachmentsPanel';
import { TaskDetailsControls } from '@/components/tasks/TaskDetailsControls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getTaskById, getTaskComments, getTaskAttachments } from '@/lib/db/queries/tasks';
import { getUserProjectRole } from '@/lib/db/queries/projects';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import type { TaskAttachment } from '@/types/project';

export const dynamic = 'force-dynamic';

export default async function TaskDetailsPage({ params }: { params: Promise<{ id: string; taskId: string; locale: string }> }) {
  const { id: projectId, taskId, locale } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: userData }, taskResult, commentsResult, attachmentsResult] = await Promise.all([
    supabase.auth.getUser(), getTaskById(taskId), getTaskComments(taskId), getTaskAttachments(taskId),
  ]);
  const user = userData.user;
  const task = taskResult.data;
  if (!user || !task || task.project_id !== projectId) notFound();
  if (commentsResult.error || attachmentsResult.error) throw new Error(commentsResult.error?.message || attachmentsResult.error?.message);

  const [role, membersResult, filesResult] = await Promise.all([
    getUserProjectRole(projectId, user.id),
    supabase.from('project_members').select('user_id, role, profile:profiles!project_members_user_id_fkey(id, full_name, email)').eq('project_id', projectId),
    supabase.from('project_files').select('id, name').eq('project_id', projectId).is('deleted_at', null).order('name'),
  ]);
  if (membersResult.error || filesResult.error) throw new Error(membersResult.error?.message || filesResult.error?.message);
  const members = (membersResult.data || []).filter((member: any) => member.role !== 'VIEWER').map((member: any) => ({ id: member.user_id, name: member.profile?.full_name || member.profile?.email || member.user_id }));
  const controlsAllowed = role === 'OWNER' || role === 'ADMIN' || task.assignee_id === user.id || task.created_by === user.id;
  const canAssign = role === 'OWNER' || role === 'ADMIN';
  const ar = locale === 'ar';
  const attachments = attachmentsResult.data as (TaskAttachment & { file?: { id: string; name: string; mime_type: string } | null })[];

  return <main className="mx-auto max-w-5xl space-y-5">
    <Button asChild variant="ghost" className="-ms-3"><Link href={`/${locale}/projects/${projectId}/tasks`}><ArrowLeft size={16} className="me-2" />{ar ? 'العودة إلى المهام' : 'Back to tasks'}</Link></Button>
    <Card className="rounded-2xl"><CardContent className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{task.project?.key} · {ar ? 'تفاصيل المهمة' : 'Task details'}</p><h1 className="mt-1 text-2xl font-semibold">{task.title}</h1></div>
        <div className="flex gap-2 text-xs"><span className="rounded-full bg-muted px-3 py-1.5">{task.status.replace('_', ' ')}</span><span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">{task.priority}</span></div></div>
      {task.description && <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{task.description}</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><UserRound size={15} />{task.assignee?.full_name || (ar ? 'غير معيّن' : 'Unassigned')}</span>{task.due_date && <span className="flex items-center gap-2"><CalendarDays size={15} />{new Date(task.due_date).toLocaleDateString(locale)}</span>}<span>{ar ? `التقدم ${task.progress}%` : `${task.progress}% complete`}</span></div>
    </CardContent></Card>
    {controlsAllowed && <TaskDetailsControls task={task} members={members} canAssign={canAssign} />}
    <TaskAttachmentsPanel taskId={taskId} projectId={projectId} attachments={attachments} files={filesResult.data || []} canManage={controlsAllowed} currentUserId={user.id} canManageAll={canAssign} />
    <Card className="rounded-2xl"><CardContent className="p-5"><CommentSection taskId={taskId} currentUserId={user.id} initialComments={commentsResult.data} /></CardContent></Card>
  </main>;
}
