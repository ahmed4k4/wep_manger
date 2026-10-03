'use client';

import { useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { LoaderCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Task, TaskPriority, TaskStatus, TaskChecklist as TaskChecklistType, Tag } from '@/types/project';
import { updateTaskAction } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskChecklist } from './TaskChecklist';
import { TaskTags } from './TaskTags';

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'];
const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDetailsControls({ 
  task, 
  members, 
  canAssign,
  checklists = [],
  tags = [],
  projectId,
}: { 
  task: Task; 
  members: { id: string; name: string }[]; 
  canAssign: boolean;
  checklists?: TaskChecklistType[];
  tags?: Tag[];
  projectId: string;
}) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignee, setAssignee] = useState(task.assignee_id || '');
  const [progress, setProgress] = useState(task.progress);
  const [busy, setBusy] = useState(false);

  const handleProgressChange = (newProgress: number) => {
    setProgress(newProgress);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await updateTaskAction(task.id, { status, priority, progress, ...(canAssign ? { assignee_id: assignee || null } : {}) });
    setBusy(false);
    if (!result.success) { toast.error(result.error || (ar ? 'تعذر تحديث المهمة' : 'Could not update task')); return; }
    toast.success(ar ? 'تم تحديث المهمة' : 'Task updated');
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{ar ? 'تفاصيل المهمة' : 'Task details'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            {ar ? 'الحالة' : 'Status'}
            <select 
              value={status} 
              onChange={(event) => setStatus(event.target.value as TaskStatus)} 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {statuses.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            {ar ? 'الأولوية' : 'Priority'}
            <select 
              value={priority} 
              onChange={(event) => setPriority(event.target.value as TaskPriority)} 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {canAssign && (
            <label className="space-y-2 text-sm font-medium">
              {ar ? 'المسند إليه' : 'Assignee'}
              <select 
                value={assignee} 
                onChange={(event) => setAssignee(event.target.value)} 
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{ar ? 'غير معيّن' : 'Unassigned'}</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          )}
          <label className="space-y-2 text-sm font-medium">
            {ar ? `التقدم · ${progress}%` : `Progress · ${progress}%`}
            <input 
              type="range" 
              min={0} 
              max={100} 
              value={progress} 
              onChange={(event) => setProgress(Number(event.target.value))} 
              className="block h-10 w-full accent-primary" 
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {ar ? 'حفظ التغييرات' : 'Save changes'}
            </Button>
          </div>
        </form>

        {/* Checklist Section */}
        <div className="mt-6 pt-6 border-t">
          <TaskChecklist 
            taskId={task.id} 
            checklists={checklists} 
            onProgressChange={handleProgressChange}
          />
        </div>

        {/* Tags Section */}
        <div className="mt-6 pt-6 border-t">
          <TaskTags 
            taskId={task.id} 
            projectId={projectId}
            tags={tags} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
