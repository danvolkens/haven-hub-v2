import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test user
export const TEST_USER_ID = 'test-user-id';
export const TEST_USER_EMAIL = 'test@example.com';

// Test database client - only create if credentials are available
export let testSupabase: SupabaseClient | null = null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeAll(async () => {
  // Only set up test data if we have real credentials
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    testSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await testSupabase.from('user_settings').upsert({
      user_id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      first_name: 'Test',
      last_name: 'User',
    });
  }
});

afterAll(async () => {
  // Clean up test data if we have real credentials
  if (testSupabase) {
    await testSupabase.from('user_settings').delete().eq('user_id', TEST_USER_ID);
  }
});

afterEach(() => {
  // Reset mocks
  vi.clearAllMocks();
});
