/**
 * Global Search Server Actions
 * Server-side actions for global search - called from Client Components
 */

'use server';

import { globalSearch, getRecentSearches, saveRecentSearch, type SearchFilters, type SearchResults } from '@/lib/db/queries/search';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export async function searchAction(
  filters: SearchFilters
): Promise<{ success: boolean; data?: SearchResults; error?: string }> {
  try {
    const { data, error } = await globalSearch(filters);

    if (error) {
      return { success: false, error: error.message };
    }

    // Save search to recent searches
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user && filters.query.trim().length >= 2) {
      await saveRecentSearch(userData.user.id, filters.query.trim());
    }

    return { success: true, data };
  } catch (err) {
    console.error('Search action error:', err);
    return { success: false, error: 'Search failed' };
  }
}

export async function getRecentSearchesAction(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const searches = await getRecentSearches(userData.user.id);
    return { success: true, data: searches };
  } catch (err) {
    console.error('Get recent searches error:', err);
    return { success: false, error: 'Failed to load recent searches' };
  }
}

export async function clearRecentSearchesAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    await supabase.from('user_searches').delete().eq('user_id', userData.user.id);
    return { success: true };
  } catch (err) {
    console.error('Clear recent searches error:', err);
    return { success: false, error: 'Failed to clear recent searches' };
  }
}