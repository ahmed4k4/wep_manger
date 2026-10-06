'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { addTaskAttachmentAction, removeTaskAttachmentAction } from '@/app/actions/tasks';
import type { TaskAttachment } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/files/FileUpload';

type AttachmentRow = TaskAttachment & { file?: { id: string; name: string; mime_type: string } | null };

export function TaskAttachmentsPanel({ taskId, projectId, attachments, files, canManage, currentUserId, canManageAll }: {
  taskId: string; projectId: string; attachments: AttachmentRow[]; files: { id: string; name: string }[]; canManage: boolean; currentUserId: string; canManageAll: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const ar = locale === 'ar';
  const [selected, setSelected] = useState('');
  // Refresh the server-rendered attachment list in place instead of a full
  // browser reload (window.location.reload), which discards the SPA state and
  // re-downloads every chunk on the page.
  const refresh = () => router.refresh();
  const [busy, setBusy] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const attachedIds = new Set(attachments.map((attachment) => attachment.file_id));
  const available = files.filter((file) => !attachedIds.has(file.id));

  const add = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const result = await addTaskAttachmentAction(taskId, selected);
    setBusy(false);
    if (!result.success) { toast.error(result.error || (ar ? 'تعذر إرفاق الملف' : 'Could not attach file')); return; }
    toast.success(ar ? 'تم إرفاق الملف' : 'File attached');
    refresh();
  };
  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const result = await removeTaskAttachmentAction(id);
    setBusy(false);
    if (!result.success) { toast.error(result.error || (ar ? 'تعذر إزالة المرفق' : 'Could not remove attachment')); return; }
    toast.success(ar ? 'تمت إزالة المرفق' : 'Attachment removed');
    refresh();
  };

  const handleUploadSuccess = (file: { id: string; name: string }) => {
    // After upload, add it as attachment
    addTaskAttachmentAction(taskId, file.id).then(result => {
      if (result.success) {
        toast.success(ar ? 'تم رفع وإرفاق الملف' : 'File uploaded and attached');
        refresh();
      } else {
        toast.error(result.error || (ar ? 'تعذر إرفاق الملف' : 'Could not attach file'));
      }
    });
    setShowUpload(false);
  };

  return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip size={17} />{ar ? 'المرفقات' : 'Attachments'} <span className="text-sm font-normal text-muted-foreground">{attachments.length}</span></CardTitle></CardHeader><CardContent className="space-y-3">
    {attachments.length === 0 && <p className="text-sm text-muted-foreground">{ar ? 'لا توجد مرفقات لهذه المهمة.' : 'No files attached to this task.'}</p>}
    {attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <Link href={`/${locale}/projects/${projectId}/files`} className="min-w-0 truncate text-sm font-medium hover:text-primary">{attachment.file?.name || (ar ? 'ملف المشروع' : 'Project file')}</Link>
      {(canManageAll || attachment.uploaded_by === currentUserId) && <Button variant="ghost" size="icon" aria-label={ar ? 'إزالة المرفق' : 'Remove attachment'} disabled={busy} onClick={() => remove(attachment.id)}><Trash2 size={15} /></Button>}
    </div>)}
    {canManage && <div className="flex flex-wrap gap-2 border-t pt-3">
      <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
        <Upload className="mr-1 h-4 w-4" />
        {ar ? 'رفع ملف جديد' : 'Upload New File'}
      </Button>
      {available.length > 0 ? <><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"><option value="">{ar ? 'اختر ملفًا من ملفات المشروع' : 'Choose a project file'}</option>{available.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</select><Button disabled={!selected || busy} onClick={add}><Plus size={15} className="me-1" />{ar ? 'إرفاق' : 'Attach'}</Button></> : <p className="self-center text-xs text-muted-foreground">{ar ? 'ارفع الملفات أولًا من' : 'Upload files first in'} <Link className="text-primary underline" href={`/${locale}/projects/${projectId}/files`}>{ar ? 'ملفات المشروع' : 'project files'}</Link>.</p>}
    </div>}
    {showUpload && (
      <div className="border-t pt-3">
        <FileUpload projectId={projectId} type="project" onSuccess={handleUploadSuccess} multiple={false} />
      </div>
    )}
  </CardContent></Card>;
}
