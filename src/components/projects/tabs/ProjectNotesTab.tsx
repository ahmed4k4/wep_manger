/**
 * Project Notes Tab
 * CRUD operations for project notes with pinning
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, Pin, PinOff, Edit2, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import type { Profile } from '@/types/project';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectNotesTabProps {
  projectId: string;
  project: Project;
}

const labels = {
  notes: { ar: 'الملاحظات', en: 'Notes' },
  search: { ar: 'البحث في الملاحظات...', en: 'Search notes...' },
  createNote: { ar: 'إنشاء ملاحظة', en: 'Create Note' },
  title: { ar: 'العنوان', en: 'Title' },
  content: { ar: 'المحتوى', en: 'Content' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  edit: { ar: 'تعديل', en: 'Edit' },
  delete: { ar: 'حذف', en: 'Delete' },
  pin: { ar: 'تثبيت', en: 'Pin' },
  unpin: { ar: 'إلغاء التثبيت', en: 'Unpin' },
  noNotes: { ar: 'لا توجد ملاحظات', en: 'No notes' },
  noNotesFiltered: { ar: 'لا توجد ملاحظات تطابق البحث', en: 'No notes match search' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  error: { ar: 'خطأ في التحميل', en: 'Error loading notes' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  confirmDelete: { ar: 'هل أنت متأكد من حذف هذه الملاحظة؟', en: 'Are you sure you want to delete this note?' },
  by: { ar: 'بواسطة', en: 'by' },
  pinned: { ar: 'مثبتة', en: 'Pinned' },
};

export function ProjectNotesTab({ projectId, project }: ProjectNotesTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual notes fetch action
      // const result = await getProjectNotesAction(projectId);
      // if (result.success) setNotes(result.data || []);
      setNotes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error[isArabic ? 'ar' : 'en']);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isArabic]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Implement create note
      // const result = await createProjectNoteAction({ project_id: projectId, ...formData });
      // if (result.success) { fetchNotes(); setShowCreate(false); setFormData({ title: '', content: '' }); }
    } catch (err) {
      console.error('Create note error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Implement update note
      // const result = await updateProjectNoteAction(editingNote.id, formData);
      // if (result.success) { fetchNotes(); setEditingNote(null); setFormData({ title: '', content: '' }); }
    } catch (err) {
      console.error('Update note error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm(labels.confirmDelete[isArabic ? 'ar' : 'en'])) return;
    try {
      // TODO: Implement delete note
      // const result = await deleteProjectNoteAction(noteId);
      // if (result.success) fetchNotes();
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  const handlePinToggle = async (noteId: string, currentlyPinned: boolean) => {
    try {
      // TODO: Implement pin toggle
      // const result = await updateProjectNoteAction(noteId, { is_pinned: !currentlyPinned });
      // if (result.success) fetchNotes();
    } catch (err) {
      console.error('Pin toggle error:', err);
    }
  };

  const startEdit = (note: any) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setFormData({ title: '', content: '' });
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) || 
                          note.content.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 bg-card border rounded-xl">
              <div className="h-4 w-1/2 bg-muted rounded mb-2" />
              <div className="h-12 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchNotes}>
            {labels.retry[isArabic ? 'ar' : 'en']}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{labels.notes[isArabic ? 'ar' : 'en']}</h2>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingNote(null); setFormData({ title: '', content: '' }); }}>
          <Plus className="mr-2 h-4 w-4" />
          {labels.createNote[isArabic ? 'ar' : 'en']}
        </Button>
      </div>

      {/* Search */}
      <Card className="border-muted/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={labels.search[isArabic ? 'ar' : 'en']}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid */}
      <div className="space-y-6">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Pin className="h-4 w-4" />
              {labels.pinned[isArabic ? 'ar' : 'en']}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isArabic={isArabic}
                  dateLocale={dateLocale}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onPinToggle={handlePinToggle}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unpinned Notes */}
        {unpinnedNotes.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unpinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isArabic={isArabic}
                  dateLocale={dateLocale}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onPinToggle={handlePinToggle}
                />
              ))}
            </div>
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-lg font-medium mb-1">
              {search ? labels.noNotesFiltered[isArabic ? 'ar' : 'en'] : labels.noNotes[isArabic ? 'ar' : 'en']}
            </p>
            {!search && (
              <Button onClick={() => { setShowCreate(true); setEditingNote(null); setFormData({ title: '', content: '' }); }} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {labels.createNote[isArabic ? 'ar' : 'en']}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editingNote) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingNote ? labels.edit[isArabic ? 'ar' : 'en'] : labels.createNote[isArabic ? 'ar' : 'en']}</CardTitle>
            </CardHeader>
            <form onSubmit={editingNote ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{labels.title[isArabic ? 'ar' : 'en']}</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={labels.title[isArabic ? 'ar' : 'en']}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{labels.content[isArabic ? 'ar' : 'en']}</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={labels.content[isArabic ? 'ar' : 'en']}
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  {labels.cancel[isArabic ? 'ar' : 'en']}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? labels.loading[isArabic ? 'ar' : 'en'] : labels.save[isArabic ? 'ar' : 'en']}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  isArabic,
  dateLocale,
  onEdit,
  onDelete,
  onPinToggle,
}: {
  note: any;
  isArabic: boolean;
  dateLocale: any;
  onEdit: (note: any) => void;
  onDelete: (noteId: string) => void;
  onPinToggle: (noteId: string, currentlyPinned: boolean) => void;
}) {
  const author = note.author;
  const initials = author?.full_name
    ? author.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : author?.email?.[0]?.toUpperCase() || '?';

  return (
    <Card className={cn('relative transition-all hover:shadow-lg', note.is_pinned && 'ring-2 ring-yellow-500/50')}>
      {note.is_pinned && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Pin className="mr-1 h-3 w-3" />
            {labels.pinned[isArabic ? 'ar' : 'en']}
          </Badge>
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold text-base mb-2 line-clamp-1">{note.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{note.content}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author?.avatar_url || undefined} alt={author?.full_name || ''} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span>{labels.by[isArabic ? 'ar' : 'en']} {author?.full_name || (isArabic ? 'مجهول' : 'Unknown')}</span>
          </div>
          <time dateTime={note.updated_at || note.created_at}>
            {formatDistanceToNow(new Date(note.updated_at || note.created_at), { addSuffix: true, locale: dateLocale })}
          </time>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(note)}>
              <Edit2 className="h-3.5 w-3.5" />
              {labels.edit[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2" onClick={() => onPinToggle(note.id, note.is_pinned)}>
              {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {note.is_pinned ? labels.unpin[isArabic ? 'ar' : 'en'] : labels.pin[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive flex items-center gap-2" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              {labels.delete[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}