/**
 * User Database Queries
 * Server-side queries for users
 */

import { createSupabaseAdminClient } from '../supabase-server';
import type { PostgrestError } from '@/types/project';

export interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('is_admin', {
      p_user_id: userId,
    });

    if (error) {
      return false;
    }

    return data as boolean;
  } catch {
    return false;
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<QueryResult<any>> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
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
 * Get user's global role
 */
export async function getUserGlobalRole(userId: string): Promise<string | null> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('global_role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.global_role;
  } catch {
    return null;
  }
}