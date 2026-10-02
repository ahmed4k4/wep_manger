'use client';

import { useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { FileText, LoaderCircle, Pin, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createProjectNoteAction, updateProjectNoteAction, deleteProjectNoteAction,
  createUserNoteAction, updateUserNoteAction, deleteUserNoteAction,
} from '@/app/actions/notes';

export interface NoteRecord {
  id: string;
  project_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author_id?: string;
  user_id?: string;
}

interface NotesManagerProps {
  mode: 'project' | 'personal';
  projectId?: string;
  initialNotes: NoteRecord[];
  projects?: { id: string; name: string; key: string }[];
  currentUserId?: string;
  canCreate?: boolean;
  canManageAll?: boolean;
}

export function NotesManager({ mode, projectId, initialNotes, projects = [], currentUserId, canCreate = true, canManageAll = false }: NotesManagerProps) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const personal = mode === 'personal';
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProject, setSelectedProject] = useState(projectId || projects[0]?.id || '');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const beginCreate = () => { setEditing('new'); setTitle(''); setContent(''); setPinned(false); };
  const beginEdit = (note: NoteRecord) => { setEditing(note.id); setTitle(note.title); setContent(note.content); setPinned(note.is_pinned); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !title.trim() || !content.trim() || (personal && !selectedProject)) return;
    setBusy(true);
    try {
      const result = editing === 'new'
        ? personal
          ? await createUserNoteAction(selectedProject, title, content)
          : await createProjectNoteAction(projectId!, title, content)
        : personal
          ? await updateUserNoteAction(editing!, title, content, pinned)
          : await updateProjectNoteAction(editing!, title, content, pinned);
      if (!result.success || !result.note) throw new Error(result.error || (ar ? 'تعذر حفظ الملاحظة' : 'Could not save note'));
      const saved = result.note as NoteRecord;
      setNotes((current) => editing === 'new' ? [saved, ...current] : current.map((note) => note.id === saved.id ? saved : note));
      setEditing(null);
      toast.success(ar ? 'تم حفظ الملاحظة' : 'Note saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (ar ? 'تعذر حفظ الملاحظة' : 'Could not save note'));
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (busy) return;
    if (!window.confirm(ar ? 'هل تريد حذف هذه الملاحظة؟' : 'Delete this note?')) return;
    setBusy(true);
    try {
      const result = personal ? await deleteUserNoteAction(id) : await deleteProjectNoteAction(id);
      if (!result.success) throw new Error(result.error || (ar ? 'تعذر حذف الملاحظة' : 'Could not delete note'));
      setNotes((current) => current.filter((note) => note.id !== id));
      toast.success(ar ? 'تم حذف الملاحظة' : 'Note deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (ar ? 'تعذر حذف الملاحظة' : 'Could not delete note'));
    } finally { setBusy(false); }
  };

  const projectName = (id: string) => projects.find((project) => project.id === id)?.name || id;
  const canEditNote = (note: NoteRecord) => personal
    ? note.user_id === currentUserId
    : canManageAll || note.author_id === currentUserId;

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">{personal ? (ar ? 'ملاحظاتك الخاصة' : 'Your private notes') : (ar ? 'مساحة مشتركة لأعضاء المشروع' : 'Shared with project members')}</p>
          <h1 className="mt-1 text-2xl font-semibold">{personal ? (ar ? 'ملاحظاتي' : 'My notes') : (ar ? 'ملاحظات المشروع' : 'Project notes')}</h1></div>
        {editing !== 'new' && canCreate && <Button onClick={beginCreate}><Plus size={16} className="me-2" />{ar ? 'ملاحظة جديدة' : 'New note'}</Button>}
      </div>

      {editing && <Card className="rounded-2xl"><CardContent className="p-5">
        <form onSubmit={save} className="space-y-4">
          {personal && <label className="block space-y-2 text-sm font-medium">{ar ? 'المشروع المرتبط' : 'Related project'}
            <select required value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={editing !== 'new'}>
              <option value="">{ar ? 'اختر مشروعًا' : 'Choose a project'}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.key}</option>)}
            </select>
          </label>}
          <Input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? 'عنوان الملاحظة' : 'Note title'} />
          <Textarea required maxLength={20000} rows={6} value={content} onChange={(event) => setContent(event.target.value)} placeholder={ar ? 'اكتب ملاحظتك...' : 'Write your note...'} />
          {editing !== 'new' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />{ar ? 'تثبيت الملاحظة' : 'Pin this note'}</label>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={busy}><X size={15} className="me-1" />{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button type="submit" disabled={busy || !title.trim() || !content.trim() || (personal && !selectedProject)}>{busy ? <LoaderCircle size={15} className="me-2 animate-spin" /> : <Save size={15} className="me-2" />}{ar ? 'حفظ' : 'Save note'}</Button></div>
        </form>
      </CardContent></Card>}

      {notes.length === 0 && editing !== 'new' ? <Card className="rounded-2xl"><CardContent className="flex flex-col items-center py-14 text-center">
        <FileText className="mb-3 h-9 w-9 text-muted-foreground" /><h2 className="font-medium">{ar ? 'لا توجد ملاحظات بعد' : 'No notes yet'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ar ? 'أنشئ ملاحظة لتجميع الأفكار والمعلومات المهمة.' : 'Create a note to keep useful context and ideas.'}</p>
        {canCreate && (personal ? projects.length > 0 : true) && <Button variant="outline" className="mt-4" onClick={beginCreate}><Plus size={15} className="me-2" />{ar ? 'إنشاء ملاحظة' : 'Create a note'}</Button>}
        {personal && projects.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{ar ? 'انضم إلى مشروع لإنشاء ملاحظات شخصية مرتبطة به.' : 'Join a project before creating a project-linked private note.'}</p>}
      </CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{notes.map((note) => <Card key={note.id} className="rounded-2xl"><CardContent className="p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2">{note.is_pinned && <Pin size={14} className="text-primary" />}<h2 className="truncate font-semibold">{note.title}</h2></div>
          {personal && <p className="mt-1 truncate text-xs text-muted-foreground">{projectName(note.project_id)}</p>}
        </div>{canEditNote(note) && <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => beginEdit(note)} disabled={busy}>{ar ? 'تعديل' : 'Edit'}</Button><Button variant="ghost" size="icon" aria-label={ar ? 'حذف' : 'Delete'} onClick={() => remove(note.id)} disabled={busy}><Trash2 size={15} /></Button></div>}</div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{note.content}</p>
        <time className="mt-4 block text-xs text-muted-foreground" dateTime={note.updated_at}>{new Date(note.updated_at).toLocaleDateString(locale)}</time>
        </CardContent></Card>)}</div>}
    </section>
  );
}
