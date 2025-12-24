import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Get the current user ID from the session
 * Throws an error if not authenticated
 */
export async function getUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user.id;
}

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return !error && !!user;
}
