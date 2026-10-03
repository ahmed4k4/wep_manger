/**
 * Task Checklist Component
 * Displays and manages checklist items for a task
 */

'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { CheckSquare, Square, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from '@/app/actions/task-checklists';
import type { TaskChecklist } from '@/types/project';
import { toast } from 'sonner';

interface TaskChecklistProps {
  taskId: string;
  checklists: TaskChecklist[];
  onProgressChange?: (progress: number) => void;
}

export function TaskChecklist({ taskId, checklists = [], onProgressChange }: TaskChecklistProps) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [items, setItems] = useState<TaskChecklist[]>(checklists);
  const [pending, startTransition] = useTransition();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Calculate progress from checklists
  const totalItems = items.length;
  const completedItems = items.filter(item => item.is_completed).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Notify parent of progress change
  if (onProgressChange) {
    onProgressChange(progress);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || pending) return;

    startTransition(async () => {
      const result = await createChecklistItem({
        task_id: taskId,
        title: newItemTitle.trim(),
      });

      if (result.error) {
        toast.error(ar ? 'فشل في إضافة عنصر القائمة' : 'Failed to add checklist item');
      } else if (result.data) {
        setItems(prev => [...prev, result.data!]);
        setNewItemTitle('');
        toast.success(ar ? 'تم إضافة عنصر القائمة' : 'Checklist item added');
      }
    });
  };

  const handleToggle = async (item: TaskChecklist) => {
    startTransition(async () => {
      // Optimistic update
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, is_completed: !item.is_completed } : i
      ));

      const result = await updateChecklistItem(item.id, {
        is_completed: !item.is_completed,
      });

      if (result.error) {
        // Rollback on error
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, is_completed: item.is_completed } : i
        ));
        toast.error(ar ? 'فشل في تحديث القائمة' : 'Failed to update checklist');
      }
    });
  };

  const handleUpdateTitle = async (item: TaskChecklist, newTitle: string) => {
    if (!newTitle.trim()) return;

    startTransition(async () => {
      const result = await updateChecklistItem(item.id, { title: newTitle.trim() });

      if (result.error) {
        toast.error(ar ? 'فشل في تحديث العنصر' : 'Failed to update item');
        setEditingId(null);
      } else {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, title: newTitle.trim() } : i
        ));
        setEditingId(null);
      }
    });
  };

  const handleDelete = async (item: TaskChecklist) => {
    startTransition(async () => {
      // Optimistic update
      setItems(prev => prev.filter(i => i.id !== item.id));

      const result = await deleteChecklistItem(item.id);

      if (result.error) {
        // Rollback on error
        setItems(prev => [...prev, item].sort((a, b) => a.position - b.position));
        toast.error(ar ? 'فشل في حذف العنصر' : 'Failed to delete item');
      }
    });
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    // Update positions
    const reorderedIds = newItems.map((_, index) => newItems[index].id);

    startTransition(async () => {
      setItems(newItems);

      const result = await reorderChecklistItems(reorderedIds);

      if (result.error) {
        // Rollback
        setItems(items);
        toast.error(ar ? 'فشل في إعادة الترتيب' : 'Failed to reorder');
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {ar ? 'التقدم' : 'Progress'}: {completedItems}/{totalItems}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist items */}
      <ul className="space-y-2" role="list">
        {items.map((item, index) => (
          <li key={item.id} className="group">
            {editingId === item.id ? (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleUpdateTitle(item, editTitle);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                  className="flex-1"
                  onBlur={() => handleUpdateTitle(item, editTitle)}
                />
                <Button type="submit" variant="ghost" size="icon">
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(null)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={e => {
                    e.preventDefault();
                    // Drag and drop would go here
                  }}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`flex-1 text-left justify-start p-2 rounded-lg hover:bg-accent ${
                    item.is_completed ? 'text-muted-foreground line-through' : ''
                  }`}
                  onClick={() => handleToggle(item)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {item.is_completed ? (
                      <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                </Button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditTitle(item.title);
                    }}
                    aria-label={ar ? 'تحرير' : 'Edit'}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item)}
                    aria-label={ar ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}

        {items.length === 0 && (
          <li className="text-center py-6 text-muted-foreground">
            {ar ? 'لا توجد عناصر في القائمة بعد' : 'No checklist items yet'}
          </li>
        )}
      </ul>

      {/* Add new item form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newItemTitle}
          onChange={e => setNewItemTitle(e.target.value)}
          placeholder={ar ? 'أضف عنصر قائمة...' : 'Add checklist item...'}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !newItemTitle.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}