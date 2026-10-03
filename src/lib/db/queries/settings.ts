/**
 * Settings Database Queries
 * Server-side database operations for user and system settings
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '../supabase-server';
import type { UserSettings, UserSettingsInput, SystemSetting, SystemSettingsCategory, SystemSettingInput } from '@/types/project';
import type { PostgrestError } from '@/types/project';

export interface SettingsQueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Get user settings (with defaults if not exist)
 */
export async function getUserSettings(userId: string): Promise<SettingsQueryResult<UserSettings>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('get_user_settings', {
      p_user_id: userId,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as UserSettings, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Upsert user settings
 */
export async function upsertUserSettings(
  userId: string,
  input: UserSettingsInput
): Promise<SettingsQueryResult<UserSettings>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('upsert_user_settings', {
      p_user_id: userId,
      p_full_name: input.full_name ?? null,
      p_avatar_url: input.avatar_url ?? null,
      p_phone: input.phone ?? null,
      p_department: input.department ?? null,
      p_job_title: input.job_title ?? null,
      p_theme: input.theme ?? null,
      p_locale: input.locale ?? null,
      p_notification_preferences: input.notification_preferences ?? null,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as UserSettings, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Get system settings by category
 */
export async function getSystemSettingsByCategory(
  category?: SystemSettingsCategory
): Promise<SettingsQueryResult<SystemSetting[]>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('get_system_settings', {
      p_category: category ?? null,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as SystemSetting[], error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Get all system settings grouped by category
 */
export async function getAllSystemSettings(): Promise<SettingsQueryResult<Record<string, SystemSetting[]>>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('get_system_settings', {
      p_category: null,
    });

    if (error) {
      return { data: null, error };
    }

    // Group by category
    const grouped = (data as SystemSetting[]).reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, SystemSetting[]>);

    return { data: grouped, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Get a single system setting by key
 */
export async function getSystemSetting(key: string): Promise<SettingsQueryResult<SystemSetting | null>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data: data as SystemSetting | null, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Create a system setting (admin only)
 */
export async function createSystemSetting(
  input: SystemSettingInput
): Promise<SettingsQueryResult<SystemSetting>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('system_settings')
      .insert(input)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as SystemSetting, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Update a system setting (admin only)
 */
export async function updateSystemSetting(
  key: string,
  value: any,
  description?: string,
  is_public?: boolean
): Promise<SettingsQueryResult<SystemSetting>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const updates: Record<string, any> = { value, updated_at: new Date().toISOString() };
    if (description !== undefined) updates.description = description;
    if (is_public !== undefined) updates.is_public = is_public;

    const { data, error } = await adminClient
      .from('system_settings')
      .update(updates)
      .eq('key', key)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as SystemSetting, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Delete a system setting (admin only)
 */
export async function deleteSystemSetting(key: string): Promise<SettingsQueryResult<boolean>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from('system_settings')
      .delete()
      .eq('key', key);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}

/**
 * Get public system settings (for non-admin users)
 */
export async function getPublicSystemSettings(): Promise<SettingsQueryResult<SystemSetting[]>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('is_public', true)
      .order('category')
      .order('key');

    if (error) {
      return { data: null, error };
    }

    return { data: data as SystemSetting[], error: null };
  } catch (err) {
    const error = err as Error;
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error', 
        code: 'INTERNAL_ERROR',
        details: '',
        hint: ''
      } as PostgrestError 
    };
  }
}
