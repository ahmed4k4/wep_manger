/**
 * Project Members Content
 * Client component for managing project members
 */

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Crown,
  Shield,
  User,
  Eye,
  Mail,
  Loader2,
} from 'lucide-react';
import type { Project, ProjectMember, ProjectRole } from '@/types/project';
import { addProjectMemberAction, updateProjectMemberRoleAction, removeProjectMemberAction } from '@/app/actions/projects';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface ProjectMembersContentProps {
  project: Project;
  stats: any;
  members: (ProjectMember & { profile: any })[];
}

const roleLabels: Record<ProjectRole, { ar: string; en: string }> = {
  OWNER: { ar: 'المالك', en: 'Owner' },
  ADMIN: { ar: 'مدير', en: 'Admin' },
  MEMBER: { ar: 'عضو', en: 'Member' },
  VIEWER: { ar: 'مشاهد', en: 'Viewer' },
};

const roleColors: Record<ProjectRole, string> = {
  OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  MEMBER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const availableRoles: { value: ProjectRole; label: { ar: string; en: string } }[] = [
  { value: 'ADMIN', label: { ar: 'مدير', en: 'Admin' } },
  { value: 'MEMBER', label: { ar: 'عضو', en: 'Member' } },
  { value: 'VIEWER', label: { ar: 'مشاهد', en: 'Viewer' } },
];

export function ProjectMembersContent({ project, stats, members: initialMembers }: ProjectMembersContentProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [members, setMembers] = useState(initialMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('MEMBER');
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const filteredMembers = members.filter((member) =>
    member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserId = ''; // TODO: Get from auth context

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    setIsAdding(true);
    // TODO: Find user by email first, then add
    // For now, mock implementation
    setTimeout(() => {
      setIsAdding(false);
      setNewMemberEmail('');
    }, 1000);
  };

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    setLoadingMemberId(memberId);
    const result = await updateProjectMemberRoleAction(project.id, memberId, newRole);
    if (result.success) {
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    }
    setLoadingMemberId(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من إزالة هذا العضو؟' : 'Are you sure you want to remove this member?')) {
      return;
    }
    setLoadingMemberId(memberId);
    const result = await removeProjectMemberAction(project.id, memberId);
    if (result.success) {
      setMembers(members.filter(m => m.id !== memberId));
    }
    setLoadingMemberId(null);
  };

  const getRoleIcon = (role: ProjectRole) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-4 w-4" />;
      case 'ADMIN': return <Shield className="h-4 w-4" />;
      case 'MEMBER': return <UserCheck className="h-4 w-4" />;
      case 'VIEWER': return <Eye className="h-4 w-4" />;
    }
  };

  const canManageMember = (member: ProjectMember & { profile: any }) => {
    // Owner can manage everyone except themselves
    // Admin can manage members and viewers (not owner or other admins)
    // Users can only remove themselves
    return true; // TODO: Implement proper permission check
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {isArabic ? 'أعضاء المشروع' : 'Project Members'}
          </h2>
          <p className="text-muted-foreground">
            {isArabic
              ? `إدارة ${members.length} عضو في المشروع`
              : `Manage ${members.length} project members`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {isArabic ? 'إضافة عضو' : 'Add Member'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isArabic ? 'دعوة عضو جديد' : 'Invite New Member'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  disabled={isAdding}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الدور' : 'Role'}</Label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر دوراً' : 'Select role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label[isArabic ? 'ar' : 'en']}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isAdding}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleAddMember} disabled={isAdding || !newMemberEmail.trim()}>
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isArabic ? 'جاري الإضافة...' : 'Adding...'}
                    </>
                  ) : (
                    isArabic ? 'إرسال دعوة' : 'Send Invite'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder={isArabic ? 'البحث عن أعضاء...' : 'Search members...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{isArabic ? 'لم يتم العثور على أعضاء' : 'No members found'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} alt={member.profile?.full_name || ''} />
                      <AvatarFallback>
                        {member.profile?.full_name
                          ? member.profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          : member.profile?.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.profile?.full_name || isArabic ? 'بدون اسم' : 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                    <Badge variant="outline" className={cn(roleColors[member.role])}>
                      <span className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {roleLabels[member.role][isArabic ? 'ar' : 'en']}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageMember(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isArabic ? 'خيارات العضو' : 'Member options'}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'ADMIN')}>
                            <Shield className="mr-2 h-4 w-4" />
                            {availableRoles.find(r => r.value === 'ADMIN')?.label[isArabic ? 'ar' : 'en']}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'MEMBER')}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            {availableRoles.find(r => r.value === 'MEMBER')?.label[isArabic ? 'ar' : 'en']}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'VIEWER')}>
                            <Eye className="mr-2 h-4 w-4" />
                            {availableRoles.find(r => r.value === 'VIEWER')?.label[isArabic ? 'ar' : 'en']}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loadingMemberId === member.id}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            {isArabic ? 'إزالة العضو' : 'Remove Member'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {loadingMemberId === member.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}