/**
 * Project Team Tab
 * Member management with roles, workload, and invitations
 */

'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, Users, Plus, Mail, MoreHorizontal, UserCheck, UserX, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import type { ProjectMember, Profile } from '@/types/project';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectTeamTabProps {
  projectId: string;
  project: Project;
}

const labels = {
  team: { ar: 'الفريق', en: 'Team' },
  search: { ar: 'البحث في الأعضاء...', en: 'Search members...' },
  allRoles: { ar: 'كل الأدوار', en: 'All Roles' },
  inviteMember: { ar: 'دعوة عضو', en: 'Invite Member' },
  noMembers: { ar: 'لا يوجد أعضاء', en: 'No members' },
  noMembersFiltered: { ar: 'لا يوجد أعضاء يطابقون البحث', en: 'No members match search' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  error: { ar: 'خطأ في التحميل', en: 'Error loading team' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  role: { ar: 'الدور', en: 'Role' },
  owner: { ar: 'المالك', en: 'Owner' },
  admin: { ar: 'مدير', en: 'Admin' },
  member: { ar: 'عضو', en: 'Member' },
  viewer: { ar: 'مشاهد', en: 'Viewer' },
  changeRole: { ar: 'تغيير الدور', en: 'Change Role' },
  removeMember: { ar: 'إزالة العضو', en: 'Remove Member' },
  confirmRemove: { ar: 'هل أنت متأكد من إزالة هذا العضو؟', en: 'Are you sure you want to remove this member?' },
  workload: { ar: 'حجم العمل', en: 'Workload' },
  tasksAssigned: { ar: 'المهام المسندة', en: 'Tasks Assigned' },
  joined: { ar: 'انضم في', en: 'Joined' },
};

const roleOptions = [
  { value: 'OWNER', label: { ar: 'المالك', en: 'Owner' }, icon: Crown },
  { value: 'ADMIN', label: { ar: 'مدير', en: 'Admin' }, icon: Shield },
  { value: 'MEMBER', label: { ar: 'عضو', en: 'Member' }, icon: UserCheck },
  { value: 'VIEWER', label: { ar: 'مشاهد', en: 'Viewer' }, icon: UserCheck },
] as const;

export function ProjectTeamTab({ projectId, project }: ProjectTeamTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const [members, setMembers] = useState<(ProjectMember & { profile: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual members fetch action
      // const result = await getProjectMembersAction(projectId);
      // if (result.success) setMembers(result.data || []);
      setMembers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error[isArabic ? 'ar' : 'en']);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isArabic]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    // TODO: Implement role change
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm(labels.confirmRemove[isArabic ? 'ar' : 'en'])) return;
    // TODO: Implement remove
  };

  const handleInvite = async (email: string, role: string) => {
    // TODO: Implement invite
  };

  const filteredMembers = members.filter((member) => {
    const profile = member.profile;
    const name = profile?.full_name || profile?.email || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    const opt = roleOptions.find((o) => o.value === role);
    return opt ? opt.label[isArabic ? 'ar' : 'en'] : role;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Crown className="mr-1 h-3 w-3" />{getRoleLabel(role)}</Badge>;
      case 'ADMIN':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"><Shield className="mr-1 h-3 w-3" />{getRoleLabel(role)}</Badge>;
      case 'MEMBER':
        return <Badge variant="secondary">{getRoleLabel(role)}</Badge>;
      case 'VIEWER':
        return <Badge variant="outline">{getRoleLabel(role)}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-card border rounded-xl">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-3 w-1/6 bg-muted rounded mt-1" />
              </div>
              <div className="h-6 w-20 bg-muted rounded" />
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
          <Button variant="outline" onClick={fetchMembers}>
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
          <h2 className="text-2xl font-bold">{labels.team[isArabic ? 'ar' : 'en']}</h2>
          <p className="text-muted-foreground">
            {members.length} {isArabic ? 'عضو' : 'member'}{members.length !== 1 && !isArabic ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <a href={`${projectPath}/team/invite`}>
            <Plus className="mr-2 h-4 w-4" />
            {labels.inviteMember[isArabic ? 'ar' : 'en']}
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={labels.search[isArabic ? 'ar' : 'en']}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={labels.allRoles[isArabic ? 'ar' : 'en']} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{labels.allRoles[isArabic ? 'ar' : 'en']}</SelectItem>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <opt.icon className="mr-2 h-4 w-4" />
                    {opt.label[isArabic ? 'ar' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium mb-1">
                {search || roleFilter
                  ? labels.noMembersFiltered[isArabic ? 'ar' : 'en']
                  : labels.noMembers[isArabic ? 'ar' : 'en']}
              </p>
              {(!search && !roleFilter) && (
                <Button asChild className="mt-4">
                  <a href={`${projectPath}/team/invite`}>
                    <Plus className="mr-2 h-4 w-4" />
                    {labels.inviteMember[isArabic ? 'ar' : 'en']}
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  project={project}
                  isArabic={isArabic}
                  dateLocale={dateLocale}
                  getRoleLabel={getRoleLabel}
                  getRoleBadge={getRoleBadge}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberCard({
  member,
  project,
  isArabic,
  dateLocale,
  getRoleLabel,
  getRoleBadge,
  onRoleChange,
  onRemove,
}: {
  member: ProjectMember & { profile: Profile };
  project: Project;
  isArabic: boolean;
  dateLocale: any;
  getRoleLabel: (role: string) => string;
  getRoleBadge: (role: string) => React.ReactNode;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string) => void;
}) {
  const profile = member.profile;
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium truncate">{profile?.full_name || profile?.email || (isArabic ? 'بدون اسم' : 'No name')}</p>
          <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:block text-right text-sm text-muted-foreground">
          <p>{labels.joined[isArabic ? 'ar' : 'en']}</p>
          <time dateTime={member.joined_at}>
            {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true, locale: dateLocale })}
          </time>
        </div>
        {getRoleBadge(member.role)}
        {member.role !== 'OWNER' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="flex items-center gap-2" onClick={() => onRoleChange(member.id, 'ADMIN')}>
                <Shield className="h-3.5 w-3.5" />
                {labels.admin[isArabic ? 'ar' : 'en']}
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2" onClick={() => onRoleChange(member.id, 'MEMBER')}>
                <UserCheck className="h-3.5 w-3.5" />
                {labels.member[isArabic ? 'ar' : 'en']}
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2" onClick={() => onRoleChange(member.id, 'VIEWER')}>
                <UserCheck className="h-3.5 w-3.5" />
                {labels.viewer[isArabic ? 'ar' : 'en']}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive flex items-center gap-2" onClick={() => onRemove(member.id)}>
                <UserX className="h-3.5 w-3.5" />
                {labels.removeMember[isArabic ? 'ar' : 'en']}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}