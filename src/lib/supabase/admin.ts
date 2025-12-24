import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url === 'your-project-url') {
    // Return a placeholder for build time - client won't work but build will pass
    return 'https://placeholder.supabase.co';
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === 'your-service-role-key') {
    // Return a placeholder for build time
    return 'placeholder-service-role-key';
  }
  return key;
}

// Admin client bypasses RLS - use with caution
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton for server-side admin operations
let adminClient: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createAdminClient();
  }
  return adminClient;
}
