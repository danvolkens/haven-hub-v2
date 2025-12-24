import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js';

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}

/**
 * Get user ID for API routes - throws error instead of redirecting
 * Use this in API routes instead of getUserId()
 */
export async function getApiUserId(): Promise<string> {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user.id;
}

/**
 * Helper for API routes - returns user or null (no redirect)
 */
export async function getApiUser(): Promise<User | null> {
  return getUser();
}

export async function getUserSettings() {
  const supabase = await createServerSupabaseClient();
  const user = await requireUser();

  const { data, error } = await (supabase as any)
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return !error && !!user;
}
