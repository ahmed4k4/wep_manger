/**
 * Task Tags Component
 * Displays and manages tags for a task
 */

'use client';

import { useState, useTransition, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Plus, Tag as TagIcon, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getProjectTags,
  createTag,
  addTagToTask,
  removeTagFromTask,
} from '@/app/actions/task-tags';
import type { Tag } from '@/types/project';
import { toast } from 'sonner';

interface TaskTagsProps {
  taskId: string;
  projectId: string;
  tags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

export function TaskTags({ taskId, projectId, tags = [], onTagsChange }: TaskTagsProps) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [pending, startTransition] = useTransition();
  const [showCreateTag, setShowCreateTag] = useState(false);

  // Load available tags on mount
  useEffect(() => {
    loadTags();
  }, [projectId]);

  const loadTags = async () => {
    const result = await getProjectTags(projectId);
    if (result.data) {
      setAvailableTags(result.data);
    }
  };

  // Get tags not already on this task
  const availableToAdd = availableTags.filter(tag => !tags.some(t => t.id === tag.id));

  const handleAddTag = async () => {
    if (!selectedTagId || pending) return;

    startTransition(async () => {
      const result = await addTagToTask(taskId, selectedTagId);

      if (result.error) {
        toast.error(ar ? 'فشل في إضافة الوسم' : 'Failed to add tag');
      } else {
        const tag = availableTags.find(t => t.id === selectedTagId);
        if (tag) {
          const newTags = [...tags, tag];
          setSelectedTagId('');
          onTagsChange?.(newTags);
          toast.success(ar ? 'تم إضافة الوسم' : 'Tag added');
        }
      }
    });
  };

  const handleRemoveTag = async (tagId: string) => {
    startTransition(async () => {
      const result = await removeTagFromTask(taskId, tagId);

      if (result.error) {
        toast.error(ar ? 'فشل في إزالة الوسم' : 'Failed to remove tag');
      } else {
        const newTags = tags.filter(t => t.id !== tagId);
        onTagsChange?.(newTags);
        toast.success(ar ? 'تم إزالة الوسم' : 'Tag removed');
      }
    });
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || pending) return;

    startTransition(async () => {
      const result = await createTag({
        project_id: projectId,
        name: newTagName.trim(),
        color: newTagColor,
      });

      if (result.error) {
        toast.error(ar ? 'فشل في إنشاء الوسم' : 'Failed to create tag');
      } else if (result.data) {
        // Add the new tag to the task immediately
        const addResult = await addTagToTask(taskId, result.data.id);
        if (!addResult.error) {
          setAvailableTags(prev => [...prev, result.data!]);
          const newTags = [...tags, result.data!];
          onTagsChange?.(newTags);
          toast.success(ar ? 'تم إنشاء وإضافة الوسم' : 'Tag created and added');
        }
        setNewTagName('');
        setShowCreateTag(false);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              <TagIcon className="h-3 w-3" />
              {tag.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={() => handleRemoveTag(tag.id)}
                aria-label={ar ? 'إزالة الوسم' : 'Remove tag'}
              >
                <X className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>
      )}

      {/* Add existing tag dropdown */}
      {availableToAdd.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedTagId}
            onChange={e => setSelectedTagId(e.target.value)}
            className="flex-1 border border-input bg-background rounded-md px-3 py-2 text-sm"
          >
            <option value="">{ar ? 'اختر وسم...' : 'Select tag...'}</option>
            {availableToAdd.map(tag => (
              <option key={tag.id} value={tag.id} style={{ color: tag.color }}>
                {tag.name}
              </option>
            ))}
          </select>
          <Button onClick={handleAddTag} disabled={pending || !selectedTagId}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{ar ? 'إضافة' : 'Add'}</span>
          </Button>
        </div>
      )}

      {/* Create new tag */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => setShowCreateTag(true)}
      >
        <Palette className="h-4 w-4" />
        {ar ? 'إنشاء وسم جديد' : 'Create new tag'}
      </Button>

      {showCreateTag && (
        <form onSubmit={handleCreateTag} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder={ar ? 'اسم الوسم...' : 'Tag name...'}
              className="flex-1"
              autoFocus
            />
            <Input
              type="color"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              className="w-10 h-10 p-0 rounded-md cursor-pointer"
              title={ar ? 'لون الوسم' : 'Tag color'}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateTag(false);
                setNewTagName('');
              }}
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={pending || !newTagName.trim()}>
              {ar ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </form>
      )}

      {tags.length === 0 && availableTags.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {ar ? 'لا توجد وسوم. أنشئ أول وسم للمشروع.' : 'No tags yet. Create the first tag for this project.'}
        </p>
      )}
    </div>
  );
}