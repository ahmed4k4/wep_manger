/**
 * Cached Auth Helpers
 *
 * `supabase.auth.getUser()` performs a network round-trip to the Supabase Auth
 * server on EVERY call. In this app it was previously invoked repeatedly within
 * a single request (middleware, locale layout, dashboard layout, and inside
 * almost every query helper), which serialised many extra round-trips and was a
 * primary cause of slow navigation between pages.
 *
 * React's `cache()` deduplicates these calls per server request, so the auth
 * server is contacted at most once per request. This is safe because the result
 * is identical for the lifetime of a single request.
 *
 * Do NOT use this in middleware (Edge runtime, different request lifecycle) —
 * middleware keeps calling `updateSession`, which also refreshes the session.
 */

import 'server-only';

import { cache } from 'react';
import { createSupabaseServerClient } from './supabase-server';

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Get the current authenticated user, deduplicated per request.
 * Returns null when there is no valid session.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Get just the current user id, deduplicated per request.
 * Returns null when there is no valid session.
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.id ?? null;
});