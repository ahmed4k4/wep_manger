'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export async function signInAction(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 1) {
    return { success: false, error: 'Enter a valid email and password.' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error || !data.user) return { success: false, error: error?.message || 'Sign in failed.' };
  return { success: true };
}

export async function signUpAction(email: string, password: string, fullName: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, error: 'Enter a valid email address.' };
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
  if (cleanName.length < 2 || cleanName.length > 100) return { success: false, error: 'Name must be between 2 and 100 characters.' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { full_name: cleanName } },
  });
  if (error || !data.user) return { success: false, error: error?.message || 'Sign up failed.' };
  return { success: true, confirmationRequired: !data.session };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { success: !error, error: error?.message };
}
