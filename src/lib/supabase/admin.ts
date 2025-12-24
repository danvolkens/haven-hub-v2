import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Admin client bypasses RLS - use with caution
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton for server-side admin operations
let adminClient: ReturnType<typeof createAdminClient> | null = null;

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createAdminClient();
  }
  return adminClient;
}
