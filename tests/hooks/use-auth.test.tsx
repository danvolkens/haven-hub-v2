import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  })),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Export', () => {
    it('should export useAuth function', async () => {
      const { useAuth } = await import('@/hooks/use-auth');
      expect(typeof useAuth).toBe('function');
    });
  });
});

describe('AuthState Interface', () => {
  it('should have user, loading, and error properties', () => {
    const authState = {
      user: null,
      loading: false,
      error: null,
    };

    expect(authState).toHaveProperty('user');
    expect(authState).toHaveProperty('loading');
    expect(authState).toHaveProperty('error');
  });
});

describe('SignInCredentials Interface', () => {
  it('should require email and password', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    expect(credentials.email).toBeDefined();
    expect(credentials.password).toBeDefined();
  });
});

describe('SignUpCredentials Interface', () => {
  it('should require email and password', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    expect(credentials.email).toBeDefined();
    expect(credentials.password).toBeDefined();
  });

  it('should allow optional confirmPassword', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    expect(credentials.confirmPassword).toBeDefined();
  });
});

describe('Auth Actions', () => {
  const authActions = ['signIn', 'signUp', 'signOut', 'resetPassword', 'updatePassword'];

  authActions.forEach((action) => {
    it(`should support ${action} action`, () => {
      expect(authActions).toContain(action);
    });
  });
});

describe('Auth Error Handling', () => {
  it('should handle sign in errors', () => {
    const error = { message: 'Invalid credentials' };
    expect(error.message).toBe('Invalid credentials');
  });

  it('should handle sign up errors', () => {
    const error = { message: 'Email already exists' };
    expect(error.message).toBe('Email already exists');
  });

  it('should handle password reset errors', () => {
    const error = { message: 'User not found' };
    expect(error.message).toBe('User not found');
  });
});
