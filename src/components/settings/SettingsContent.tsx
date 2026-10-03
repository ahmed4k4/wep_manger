/**
 * Settings Content
 * Client component for managing user settings with tabs
 */

'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Save,
  Loader2,
  CheckCircle,
  Shield,
  User,
  Palette,
  Bell,
  AlertCircle,
} from 'lucide-react';
import type { UserSettings, Theme, Locale, NotificationPreferences, UserSettingsInput } from '@/types/project';
import {
  updateUserSettingsAction,
  getAllSystemSettingsAction,
  updateSystemSettingAction,
} from '@/app/actions/settings';

interface SettingsContentProps {
  initialSettings: UserSettings;
}

const themeOptions: { value: Theme; label: { ar: string; en: string } }[] = [
  { value: 'light', label: { ar: 'فاتح', en: 'Light' } },
  { value: 'dark', label: { ar: 'داكن', en: 'Dark' } },
  { value: 'system', label: { ar: 'النظام', en: 'System' } },
];

const localeOptions: { value: Locale; label: { ar: string; en: string } }[] = [
  { value: 'en', label: { ar: 'الإنجليزية', en: 'English' } },
  { value: 'ar', label: { ar: 'العربية', en: 'Arabic' } },
];

export function SettingsContent({ initialSettings }: SettingsContentProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const t = useTranslations('settings');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'admin'>('profile');

  const handleTabChange = (value: string) => {
    if (['profile', 'appearance', 'notifications', 'admin'].includes(value)) {
      setActiveTab(value as 'profile' | 'appearance' | 'notifications' | 'admin');
    }
  };
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  const checkAdmin = async () => {
    try {
      const result = await getAllSystemSettingsAction();
      if (result.success && result.data) {
        setSystemSettings(result.data);
        setIsAdmin(true);
      }
    } catch {
      // Not admin
      setIsAdmin(false);
    }
  };

  // Load admin settings when admin tab is selected
  const handleAdminTabClick = async () => {
    if (!isAdmin) {
      setIsLoadingAdmin(true);
      await checkAdmin();
      setIsLoadingAdmin(false);
    }
    setActiveTab('admin');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    const input: UserSettingsInput = {
      full_name: settings.full_name,
      avatar_url: settings.avatar_url,
      phone: settings.phone,
      department: settings.department,
      job_title: settings.job_title,
      theme: settings.theme,
      locale: settings.locale,
      notification_preferences: settings.notification_preferences,
    };

    const result = await updateUserSettingsAction(input);

    if (result.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      router.refresh();
    } else {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleSystemSettingSave = async (key: string, value: any) => {
    const result = await updateSystemSettingAction(key, value);
    if (!result.success) {
      alert(`Failed to update setting: ${result.error}`);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value,
      },
    }));
  };

  const tabLabels = {
    profile: { ar: 'الملف الشخصي', en: 'Profile', icon: User },
    appearance: { ar: 'المظهر', en: 'Appearance', icon: Palette },
    notifications: { ar: 'الإشعارات', en: 'Notifications', icon: Bell },
    admin: { ar: 'إدارة النظام', en: 'Admin', icon: Shield },
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            {tabLabels.profile[isArabic ? 'ar' : 'en']}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            {tabLabels.appearance[isArabic ? 'ar' : 'en']}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            {tabLabels.notifications[isArabic ? 'ar' : 'en']}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" onClick={handleAdminTabClick}>
              <Shield className="mr-2 h-4 w-4" />
              {tabLabels.admin[isArabic ? 'ar' : 'en']}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('profile.title')}
              </CardTitle>
              <CardDescription>{t('profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full-name">{t('profile.fullName')}</Label>
                <Input
                  id="full-name"
                  value={settings.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder={isArabic ? 'الاسم الكامل' : 'Full name'}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('profile.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={isArabic ? 'رقم الهاتف' : 'Phone number'}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">{t('profile.department')}</Label>
                <Input
                  id="department"
                  value={settings.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder={isArabic ? 'القسم' : 'Department'}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title">{t('profile.jobTitle')}</Label>
                <Input
                  id="job-title"
                  value={settings.job_title}
                  onChange={(e) => handleChange('job_title', e.target.value)}
                  placeholder={isArabic ? 'المسمى الوظيفي' : 'Job title'}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-url">{t('profile.avatarUrl')}</Label>
                <Input
                  id="avatar-url"
                  type="url"
                  value={settings.avatar_url}
                  onChange={(e) => handleChange('avatar_url', e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  {t('profile.avatarUrlHint')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('appearance.title')}
              </CardTitle>
              <CardDescription>{t('appearance.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t('appearance.theme')}</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => handleChange('theme', value as Theme)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر المظهر' : 'Select theme'} />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label[isArabic ? 'ar' : 'en']}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('appearance.themeHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('appearance.language')}</Label>
                <Select
                  value={settings.locale}
                  onValueChange={(value) => handleChange('locale', value as Locale)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر اللغة' : 'Select language'} />
                  </SelectTrigger>
                  <SelectContent>
                    {localeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label[isArabic ? 'ar' : 'en']}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('appearance.languageHint')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notifications.title')}
              </CardTitle>
              <CardDescription>{t('notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.notification_preferences).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => handleNotificationChange(key as keyof NotificationPreferences, checked)}
                      disabled={isSaving}
                    />
                    <div>
                      <p className="font-medium">{t(`notifications.${key}`)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`notifications.${key}Hint`)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('notifications.emailDigest')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('notifications.emailDigestHint')}
                  </p>
                </div>
                <Switch
                  checked={settings.notification_preferences.task_assignments} // Using as placeholder
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="space-y-6">
          {isLoadingAdmin ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">{t('admin.loading')}</span>
            </div>
          ) : isAdmin ? (
            <>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {tabLabels.admin[isArabic ? 'ar' : 'en']}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {t('admin.warning')}
                </span>
              </div>

              {Object.entries(systemSettings).map(([category, settings]) => (
                <Card key={category} className="space-y-4">
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{category.replace(/_/g, ' ')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings.map((setting: any) => (
                      <div key={setting.key} className="space-y-2">
                        <Label htmlFor={setting.key}>
                          {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Label>
                        {typeof setting.value === 'boolean' ? (
                          <Switch
                            id={setting.key}
                            checked={setting.value}
                            onCheckedChange={(checked) => handleSystemSettingSave(setting.key, checked)}
                          />
                        ) : typeof setting.value === 'number' ? (
                          <Input
                            id={setting.key}
                            type="number"
                            value={setting.value}
                            onChange={(e) => handleSystemSettingSave(setting.key, Number(e.target.value))}
                          />
                        ) : typeof setting.value === 'object' ? (
                          <Textarea
                            id={setting.key}
                            value={JSON.stringify(setting.value, null, 2)}
                            onChange={(e) => {
                              try {
                                handleSystemSettingSave(setting.key, JSON.parse(e.target.value));
                              } catch {
                                // Invalid JSON, ignore
                              }
                            }}
                            rows={4}
                            className="font-mono text-sm"
                          />
                        ) : (
                          <Input
                            id={setting.key}
                            value={setting.value}
                            onChange={(e) => handleSystemSettingSave(setting.key, e.target.value)}
                          />
                        )}
                        {setting.description && (
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('admin.accessDenied')}</h3>
                <p className="text-muted-foreground">{t('admin.accessDeniedDescription')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button - only for user settings tabs */}
      {activeTab !== 'admin' && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('common.saved')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('common.saveChanges')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}