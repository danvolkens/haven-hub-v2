import { vi, type Mock } from 'vitest';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { TEST_USER_ID, TEST_USER_EMAIL } from '../setup';

// Mock user data
export const mockUser: User = {
  id: TEST_USER_ID,
  email: TEST_USER_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: '',
  confirmation_sent_at: undefined,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  phone_confirmed_at: undefined,
  last_sign_in_at: new Date().toISOString(),
  identities: [],
  factors: [],
  is_anonymous: false,
};

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

// Chainable query builder mock
export function createQueryMock(data: unknown = [], error: unknown = null) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    csv: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  // Make chainMock thenable
  return new Proxy(chainMock, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (value: { data: unknown; error: unknown }) => void) =>
          resolve({ data, error });
      }
      return target[prop as keyof typeof target];
    },
  });
}

// Storage mock
export const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock-url.com' } }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed-url.com' }, error: null }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
};

// Auth mock
export function createAuthMock(options?: {
  user?: User | null;
  session?: Session | null;
  error?: AuthError | null;
}) {
  const { user = mockUser, session = mockSession, error = null } = options || {};

  return {
    getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    getSession: vi.fn().mockResolvedValue({ data: { session }, error }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user, session }, error }),
    signUp: vi.fn().mockResolvedValue({ data: { user, session }, error }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    setSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
  };
}

// Complete Supabase client mock
export interface MockSupabaseClient {
  auth: ReturnType<typeof createAuthMock>;
  from: Mock;
  storage: typeof mockStorage;
  rpc: Mock;
  channel: Mock;
}

export function createMockSupabaseClient(options?: {
  user?: User | null;
  session?: Session | null;
  queryData?: Record<string, unknown>;
}): MockSupabaseClient {
  const { user, session, queryData = {} } = options || {};

  return {
    auth: createAuthMock({ user, session }),
    from: vi.fn((table: string) => {
      const data = queryData[table] || [];
      return createQueryMock(data);
    }),
    storage: mockStorage,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
      unsubscribe: vi.fn(),
    })),
  };
}

// Helper to mock server-side Supabase client
export function mockServerSupabase(mockClient: MockSupabaseClient) {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockClient)),
  }));
}

// Helper to mock browser-side Supabase client
export function mockBrowserSupabase(mockClient: MockSupabaseClient) {
  vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => mockClient),
    getSupabaseBrowserClient: vi.fn(() => mockClient),
  }));
}

// Reset all Supabase mocks
export function resetSupabaseMocks(mockClient: MockSupabaseClient) {
  mockClient.auth.getUser.mockClear();
  mockClient.auth.getSession.mockClear();
  mockClient.auth.signInWithPassword.mockClear();
  mockClient.auth.signUp.mockClear();
  mockClient.auth.signOut.mockClear();
  mockClient.from.mockClear();
  mockClient.storage.from.mockClear();
  mockClient.rpc.mockClear();
}
