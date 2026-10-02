/**
 * Project Settings Content
 * Client component for managing project settings
 */

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Save,
  Archive,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/project';
import { updateProjectAction, deleteProjectAction } from '@/app/actions/projects';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface ProjectSettingsContentProps {
  project: Project;
  stats: any;
}

const statusOptions: { value: ProjectStatus; label: { ar: string; en: string } }[] = [
  { value: 'ACTIVE', label: { ar: 'نشط', en: 'Active' } },
  { value: 'ON_HOLD', label: { ar: 'معلق', en: 'On Hold' } },
  { value: 'ARCHIVED', label: { ar: 'مؤرشف', en: 'Archived' } },
];

const labels = {
  general: { ar: 'عام', en: 'General' },
  projectName: { ar: 'اسم المشروع', en: 'Project Name' },
  projectKey: { ar: 'مفتاح المشروع', en: 'Project Key' },
  description: { ar: 'الوصف', en: 'Description' },
  status: { ar: 'الحالة', en: 'Status' },
  saveChanges: { ar: 'حفظ التغييرات', en: 'Save Changes' },
  saving: { ar: 'جاري الحفظ...', en: 'Saving...' },
  saved: { ar: 'تم الحفظ', en: 'Saved' },
  dangerZone: { ar: 'منطقة الخطر', en: 'Danger Zone' },
  archiveProject: { ar: 'أرشفة المشروع', en: 'Archive Project' },
  archiveDescription: { ar: 'نقل المشروع إلى الأرشيف. سيصبح للقراءة فقط ولكن ستظل البيانات محفوظة.', en: 'Move project to archive. It will become read-only but data will be preserved.' },
  deleteProject: { ar: 'حذف المشروع', en: 'Delete Project' },
  deleteDescription: { ar: 'حذف المشروع نهائياً وجميع بياناته. لا يمكن التراجع عن هذا الإجراء.', en: 'Permanently delete project and all its data. This action cannot be undone.' },
  confirmArchive: { ar: 'تأكيد الأرشفة', en: 'Confirm Archive' },
  confirmDelete: { ar: 'تأكيد الحذف', en: 'Confirm Delete' },
  typeProjectName: { ar: 'اكتب اسم المشروع للتأكيد', en: 'Type project name to confirm' },
};

export function ProjectSettingsContent({ project, stats }: ProjectSettingsContentProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<string>(project.status);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    const result = await updateProjectAction(project.id, { name, description, status: status as ProjectStatus });
    if (result.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Refresh page to get updated data
      router.refresh();
    } else {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleArchive = async () => {
    // For archive, we update status to ARCHIVED
    const result = await updateProjectAction(project.id, { status: 'ARCHIVED' });
    if (result.success) {
      router.push('/projects');
    }
    setShowArchiveConfirm(false);
  };

  const handleDelete = async () => {
    const result = await deleteProjectAction(project.id);
    if (result.success) {
      router.push('/projects');
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {labels.general[isArabic ? 'ar' : 'en']}
          </CardTitle>
          <CardDescription>
            {isArabic ? 'إدارة إعدادات المشروع الأساسية' : 'Manage basic project settings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name">{labels.projectName[isArabic ? 'ar' : 'en']}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isArabic ? 'اسم المشروع' : 'Project name'}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-key">{labels.projectKey[isArabic ? 'ar' : 'en']}</Label>
            <Input
              id="project-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="PROJ"
              maxLength={10}
              disabled={isSaving}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {isArabic
                ? 'مفتاح فريد للمشروع (2-10 أحرف، أحرف كبيرة وأرقام فقط)'
                : 'Unique project key (2-10 chars, uppercase letters and numbers only)'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">{labels.description[isArabic ? 'ar' : 'en']}</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isArabic ? 'وصف المشروع' : 'Project description'}
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>{labels.status[isArabic ? 'ar' : 'en']}</Label>
            <Select value={status} onValueChange={setStatus} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'اختر الحالة' : 'Select status'} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label[isArabic ? 'ar' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || (name === project.name && description === project.description && status === project.status)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {labels.saving[isArabic ? 'ar' : 'en']}
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {labels.saved[isArabic ? 'ar' : 'en']}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {labels.saveChanges[isArabic ? 'ar' : 'en']}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {labels.dangerZone[isArabic ? 'ar' : 'en']}
          </CardTitle>
          <CardDescription>
            {isArabic ? 'إجراءات لا رجعة فيها. توخ الحذر.' : 'Irreversible actions. Proceed with caution.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Archive Project */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">{labels.archiveProject[isArabic ? 'ar' : 'en']}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {labels.archiveDescription[isArabic ? 'ar' : 'en']}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowArchiveConfirm(true)}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Archive className="mr-2 h-4 w-4" />
              {labels.archiveProject[isArabic ? 'ar' : 'en']}
            </Button>
          </div>

          <Separator />

          {/* Delete Project */}
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div>
              <h4 className="font-medium text-destructive">{labels.deleteProject[isArabic ? 'ar' : 'en']}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {labels.deleteDescription[isArabic ? 'ar' : 'en']}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {labels.deleteProject[isArabic ? 'ar' : 'en']}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title={labels.confirmArchive[isArabic ? 'ar' : 'en']}
        description={isArabic
          ? `هل أنت متأكد من أرشفة "${project.name}"؟ سيصبح المشروع للقراءة فقط.`
          : `Are you sure you want to archive "${project.name}"? The project will become read-only.`}
        confirmText={labels.archiveProject[isArabic ? 'ar' : 'en']}
        onConfirm={handleArchive}
        variant="destructive"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={labels.confirmDelete[isArabic ? 'ar' : 'en']}
        description={isArabic
          ? `هذا الإجراء لا رجعة فيه. اكتب "${project.name}" للتأكيد.`
          : `This action is irreversible. Type "${project.name}" to confirm.`}
        confirmText={labels.deleteProject[isArabic ? 'ar' : 'en']}
        onConfirm={handleDelete}
        variant="destructive"
        requireConfirmation={true}
        confirmationValue={project.name}
        confirmationInput={deleteConfirmation}
        onConfirmationChange={setDeleteConfirmation}
      />
    </div>
  );
}

// Reusable confirmation dialog
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
  requireConfirmation?: boolean;
  confirmationValue?: string;
  confirmationInput?: string;
  onConfirmationChange?: (value: string) => void;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  variant = 'default',
  requireConfirmation = false,
  confirmationValue,
  confirmationInput,
  onConfirmationChange,
}: ConfirmDialogProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  if (!open) return null;

  const isConfirmDisabled = requireConfirmation && confirmationInput !== confirmationValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          {requireConfirmation && confirmationValue && (
            <div className="space-y-2 mb-4">
              <Label className="text-sm font-medium">
                {isArabic ? 'اكتب اسم المشروع للتأكيد:' : 'Type project name to confirm:'}
              </Label>
              <Input
                value={confirmationInput || ''}
                onChange={(e) => onConfirmationChange?.(e.target.value)}
                placeholder={confirmationValue}
                className={cn(
                  'border-destructive/50 focus:border-destructive',
                  confirmationInput && confirmationInput !== confirmationValue && 'border-destructive'
                )}
              />
              {confirmationInput && confirmationInput !== confirmationValue && (
                <p className="text-xs text-destructive">
                  {isArabic ? 'يجب أن يتطابق الاسم تماماً' : 'Name must match exactly'}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              disabled={isConfirmDisabled}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}