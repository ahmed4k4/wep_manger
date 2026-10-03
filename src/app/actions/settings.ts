/**
 * Settings Server Actions
 * Server-side mutations for user and system settings - called from Client Components
 */

'use server';

import { revalidatePath } from 'next/cache';
import {
  getUserSettings as getUserSettingsQuery,
  upsertUserSettings as upsertUserSettingsQuery,
  getSystemSettingsByCategory as getSystemSettingsByCategoryQuery,
  getAllSystemSettings as getAllSystemSettingsQuery,
  getSystemSetting as getSystemSettingQuery,
  createSystemSetting as createSystemSettingQuery,
  updateSystemSetting as updateSystemSettingQuery,
  deleteSystemSetting as deleteSystemSettingQuery,
  getPublicSystemSettings as getPublicSystemSettingsQuery,
} from '@/lib/db/queries/settings';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isAdmin } from '@/lib/db/queries/users';
import type { UserSettingsInput, SystemSettingInput, SystemSettingsCategory } from '@/types/project';

// ============================================================================
// User Settings Actions
// ============================================================================

/**
 * Get current user's settings
 */
export async function getUserSettingsAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getUserSettingsQuery>>['data'];
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await getUserSettingsQuery(user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to get user settings' };
  }
}

/**
 * Update current user's settings
 */
export async function updateUserSettingsAction(
  input: UserSettingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await upsertUserSettingsQuery(user.id, input);

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate settings page
    revalidatePath('/settings');
    revalidatePath('/settings/profile');
    revalidatePath('/settings/appearance');
    revalidatePath('/settings/notifications');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update user settings' };
  }
}

// ============================================================================
// System Settings Actions (Admin only)
// ============================================================================

/**
 * Check if current user is admin
 */
async function checkAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { isAdmin: false };
    }

    const admin = await isAdmin(user.id);
    return { isAdmin: admin, userId: user.id };
  } catch {
    return { isAdmin: false };
  }
}

/**
 * Get system settings by category (admin only)
 */
export async function getSystemSettingsByCategoryAction(
  category?: SystemSettingsCategory
): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getSystemSettingsByCategoryQuery>>['data'];
  error?: string;
}> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { data, error } = await getSystemSettingsByCategoryQuery(category);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to get system settings' };
  }
}

/**
 * Get all system settings grouped by category (admin only)
 */
export async function getAllSystemSettingsAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getAllSystemSettingsQuery>>['data'];
  error?: string;
}> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { data, error } = await getAllSystemSettingsQuery();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to get system settings' };
  }
}

/**
 * Get a single system setting by key (admin only)
 */
export async function getSystemSettingAction(key: string): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getSystemSettingQuery>>['data'];
  error?: string;
}> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { data, error } = await getSystemSettingQuery(key);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to get system setting' };
  }
}

/**
 * Create a system setting (admin only)
 */
export async function createSystemSettingAction(
  input: SystemSettingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { error } = await createSystemSettingQuery(input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to create system setting' };
  }
}

/**
 * Update a system setting (admin only)
 */
export async function updateSystemSettingAction(
  key: string,
  value: any,
  description?: string,
  is_public?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { error } = await updateSystemSettingQuery(key, value, description, is_public);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update system setting' };
  }
}

/**
 * Delete a system setting (admin only)
 */
export async function deleteSystemSettingAction(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { isAdmin } = await checkAdmin();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    const { error } = await deleteSystemSettingQuery(key);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete system setting' };
  }
}

/**
 * Get public system settings (for non-admin users)
 */
export async function getPublicSystemSettingsAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getPublicSystemSettingsQuery>>['data'];
  error?: string;
}> {
  try {
    const { data, error } = await getPublicSystemSettingsQuery();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to get public system settings' };
  }
}