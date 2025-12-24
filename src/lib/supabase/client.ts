import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url === 'your-project-url') {
    // Return a placeholder for build time - client won't work but build will pass
    return 'https://placeholder.supabase.co';
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key === 'your-anon-key') {
    // Return a placeholder for build time
    return 'placeholder-anon-key';
  }
  return key;
}

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}

// Singleton for client-side usage
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
