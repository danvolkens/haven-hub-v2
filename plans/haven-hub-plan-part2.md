# Haven Hub: Complete Implementation Task Plan
## Part 2: Steps 1.8-1.10, Phases 2-4

---

## Step 1.8: Set Up Supabase Client Configuration

- **Task**: Configure Supabase client for both server and browser contexts, including middleware for session management.

- **Files**:

### `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
```

### `lib/supabase/server.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
      },
    }
  );
}

// Alias for cleaner imports
export const createServerClient = createServerSupabaseClient;
```

### `lib/supabase/admin.ts`
```typescript
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
```

### `lib/supabase/middleware.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();

  return { response, session, supabase };
}
```

### `middleware.ts`
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/quiz',
  '/landing',
  '/links',
  '/photos/submit',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/webhooks',
  '/api/cron',
  '/api/quiz',
  '/api/public',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes and API webhooks
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Update session and check authentication
  const { response, session } = await updateSession(request);

  // Redirect to login if no session on protected routes
  if (!session && pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if authenticated user visits auth pages
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### `types/supabase.ts`
```typescript
// This file will be auto-generated by Supabase CLI
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
// For now, we provide base types that will be extended

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          global_mode: 'supervised' | 'assisted' | 'autopilot';
          module_overrides: Json;
          transitioning_to: 'supervised' | 'assisted' | 'autopilot' | null;
          transition_started_at: string | null;
          guardrails: Json;
          timezone: string;
          setup_progress: Json;
          setup_completed_at: string | null;
          digest_preferences: Json;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          global_mode?: 'supervised' | 'assisted' | 'autopilot';
          module_overrides?: Json;
          transitioning_to?: 'supervised' | 'assisted' | 'autopilot' | null;
          transition_started_at?: string | null;
          guardrails?: Json;
          timezone?: string;
          setup_progress?: Json;
          setup_completed_at?: string | null;
          digest_preferences?: Json;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          global_mode?: 'supervised' | 'assisted' | 'autopilot';
          module_overrides?: Json;
          transitioning_to?: 'supervised' | 'assisted' | 'autopilot' | null;
          transition_started_at?: string | null;
          guardrails?: Json;
          timezone?: string;
          setup_progress?: Json;
          setup_completed_at?: string | null;
          digest_preferences?: Json;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          module: string | null;
          details: Json;
          executed: boolean;
          operator_mode: string;
          previous_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          module?: string | null;
          details?: Json;
          executed?: boolean;
          operator_mode: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          module?: string | null;
          details?: Json;
          executed?: boolean;
          operator_mode?: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
      };
      approval_items: {
        Row: {
          id: string;
          user_id: string;
          type: 'asset' | 'mockup' | 'pin' | 'ugc' | 'product';
          status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'processing';
          reference_id: string;
          reference_table: string;
          payload: Json;
          confidence_score: number | null;
          flags: string[];
          flag_reasons: Json;
          priority: number;
          processed_at: string | null;
          processed_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'asset' | 'mockup' | 'pin' | 'ugc' | 'product';
          status?: 'pending' | 'approved' | 'rejected' | 'skipped' | 'processing';
          reference_id: string;
          reference_table: string;
          payload: Json;
          confidence_score?: number | null;
          flags?: string[];
          flag_reasons?: Json;
          priority?: number;
          processed_at?: string | null;
          processed_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'asset' | 'mockup' | 'pin' | 'ugc' | 'product';
          status?: 'pending' | 'approved' | 'rejected' | 'skipped' | 'processing';
          reference_id?: string;
          reference_table?: string;
          payload?: Json;
          confidence_score?: number | null;
          flags?: string[];
          flag_reasons?: Json;
          priority?: number;
          processed_at?: string | null;
          processed_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
```

- **Step Dependencies**: Step 1.1
- **User Instructions**: 
  1. Create a Supabase project at supabase.com
  2. Copy `.env.local.example` to `.env.local`
  3. Add Supabase URL and keys from project settings → API
  4. After creating tables, run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts`

---

## Step 1.9: Implement Authentication Flow

- **Task**: Create authentication pages and implement auth hooks using Supabase Auth.

- **Files**:

### `lib/auth/session.ts`
```typescript
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js';

export async function getSession(): Promise<Session | null> {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = createServerSupabaseClient();
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

export async function getUserSettings() {
  const supabase = createServerSupabaseClient();
  const user = await requireUser();
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }
  
  return data;
}
```

### `hooks/use-auth.ts`
```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends SignInCredentials {
  confirmPassword?: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setState({
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          user: null,
          loading: false,
          error: error as AuthError,
        });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          loading: false,
        }));

        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signIn = useCallback(
    async ({ email, password }: SignInCredentials) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false, error }));
        return { success: false, error };
      }

      setState({
        user: data.user,
        loading: false,
        error: null,
      });

      return { success: true, user: data.user };
    },
    [supabase]
  );

  const signUp = useCallback(
    async ({ email, password }: SignUpCredentials) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false, error }));
        return { success: false, error };
      }

      setState((prev) => ({ ...prev, loading: false }));

      return { success: true, user: data.user };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
    router.push('/login');
  }, [supabase, router]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    },
    [supabase]
  );

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
}
```

### `contexts/auth-context.tsx`
```typescript
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: AuthError; user?: User }>;
  signUp: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: AuthError; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: AuthError }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

### `app/(auth)/layout.tsx`
```typescript
import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sage-pale items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-display text-charcoal mb-4">Haven Hub</h1>
            <p className="text-body-lg text-[var(--color-text-secondary)]">
              Your comprehensive marketing operations platform for Haven &amp; Hold
            </p>
          </div>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-sage flex items-center justify-center text-white text-caption">✓</div>
              <div>
                <p className="font-medium text-charcoal">Unified Content Creation</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Design engine with automated asset generation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-sage flex items-center justify-center text-white text-caption">✓</div>
              <div>
                <p className="font-medium text-charcoal">Pinterest Automation</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Smart scheduling, analytics, and A/B testing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-sage flex items-center justify-center text-white text-caption">✓</div>
              <div>
                <p className="font-medium text-charcoal">Customer Journey Management</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Lead capture, nurturing, and win-back sequences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-h1 text-charcoal">Haven Hub</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### `app/(auth)/login/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handleChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Validate form
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<LoginForm> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginForm;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { success, error } = await signIn(form);

      if (!success) {
        setAuthError(error?.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      router.push(redirectTo);
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-h1 text-charcoal">Welcome back</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {authError && (
          <div className="rounded-md bg-error/10 border border-error/20 p-3">
            <p className="text-body-sm text-error">{authError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-body-sm text-sage hover:text-sage/80"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
            onRightIconClick={() => setShowPassword(!showPassword)}
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-sage hover:text-sage/80 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

### `app/(auth)/signup/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { cn } from '@/lib/utils';

const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(form.password) },
    { label: 'One number', met: /[0-9]/.test(form.password) },
  ];

  const handleChange = (field: keyof SignupForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignupForm, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SignupForm;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { success: signupSuccess, error } = await signUp({
        email: form.email,
        password: form.password,
      });

      if (!signupSuccess) {
        setAuthError(error?.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-h1 text-charcoal">Check your email</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          We&apos;ve sent a confirmation link to <strong>{form.email}</strong>
        </p>
        <p className="mt-4 text-body-sm text-[var(--color-text-tertiary)]">
          Click the link in the email to verify your account and complete setup.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-6">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-h1 text-charcoal">Create your account</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Start managing your marketing operations today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {authError && (
          <div className="rounded-md bg-error/10 border border-error/20 p-3">
            <p className="text-body-sm text-error">{authError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
            onRightIconClick={() => setShowPassword(!showPassword)}
            autoComplete="new-password"
          />
          {form.password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={cn(
                    'flex items-center gap-2 text-caption',
                    req.met ? 'text-success' : 'text-[var(--color-text-tertiary)]'
                  )}
                >
                  {req.met ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            leftIcon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Checkbox
            id="acceptTerms"
            checked={form.acceptTerms}
            onChange={handleChange('acceptTerms')}
            label={
              <span className="text-body-sm">
                I agree to the{' '}
                <Link href="/terms" className="text-sage hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-sage hover:underline">
                  Privacy Policy
                </Link>
              </span>
            }
          />
          {errors.acceptTerms && (
            <p className="text-caption text-error">{errors.acceptTerms}</p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-[var(--color-text-secondary)]">
        Already have an account?{' '}
        <Link href="/login" className="text-sage hover:text-sage/80 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

### `app/(auth)/forgot-password/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Label } from '@/components/ui';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { success: resetSuccess, error: resetError } = await resetPassword(email);

      if (!resetSuccess) {
        setError(resetError?.message || 'Failed to send reset email');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-h1 text-charcoal">Check your email</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          We&apos;ve sent a password reset link to <strong>{email}</strong>
        </p>
        <p className="mt-4 text-body-sm text-[var(--color-text-tertiary)]">
          Didn&apos;t receive the email? Check your spam folder or try again.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
          >
            Try a different email
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center text-body-sm text-[var(--color-text-secondary)] hover:text-charcoal mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <h2 className="text-h1 text-charcoal">Reset your password</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-error/10 border border-error/20 p-3">
            <p className="text-body-sm text-error">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            error={error || undefined}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
```

### `app/(auth)/reset-password/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { updatePassword } = useAuth();
  const router = useRouter();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(form.password) },
    { label: 'One number', met: /[0-9]/.test(form.password) },
  ];

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<typeof form> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof typeof form;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { success: updateSuccess, error: updateError } = await updatePassword(
        form.password
      );

      if (!updateSuccess) {
        setError(updateError?.message || 'Failed to update password');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
          <Check className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-h1 text-charcoal">Password updated</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Your password has been successfully updated.
        </p>
        <Link href="/login">
          <Button className="mt-6">Sign in with new password</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-h1 text-charcoal">Set new password</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Create a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-error/10 border border-error/20 p-3">
            <p className="text-body-sm text-error">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
            onRightIconClick={() => setShowPassword(!showPassword)}
            autoComplete="new-password"
            autoFocus
          />
          {form.password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={cn(
                    'flex items-center gap-2 text-caption',
                    req.met ? 'text-success' : 'text-[var(--color-text-tertiary)]'
                  )}
                >
                  {req.met ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            leftIcon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
```

### `app/(auth)/callback/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_error', requestUrl.origin)
  );
}
```

### `app/(auth)/confirm/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (token_hash && type) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'signup' | 'recovery' | 'email',
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=verification_failed', requestUrl.origin)
  );
}
```

- **Step Dependencies**: Step 1.8
- **User Instructions**: 
  1. Enable Email auth provider in Supabase Dashboard → Authentication → Providers
  2. Configure Site URL in Authentication → URL Configuration to your domain
  3. Customize email templates in Authentication → Email Templates (optional)

---

## Step 1.10: Create Dashboard Layout and React Query Setup

- **Task**: Implement the authenticated dashboard layout and configure TanStack Query for data fetching.

- **Files**:

### `lib/query-client.ts`
```typescript
import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
};

// Factory function to create a new QueryClient
export function makeQueryClient() {
  return new QueryClient(queryClientConfig);
}

// Singleton for browser usage
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
```

### `components/providers/query-provider.tsx`
```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
```

### `components/providers/toast-provider.tsx`
```typescript
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant, action?: Toast['action']) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 5000;
const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', action?: Toast['action']) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((prev) => {
        const newToasts = [...prev, { id, message, variant, action }];
        // Limit to MAX_TOASTS
        if (newToasts.length > MAX_TOASTS) {
          return newToasts.slice(-MAX_TOASTS);
        }
        return newToasts;
      });

      // Auto-dismiss after duration
      setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION);

      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-success/10 border-success/20',
    iconClass: 'text-success',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-error/10 border-error/20',
    iconClass: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-info/10 border-info/20',
    iconClass: 'text-info',
  },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const config = variantConfig[toast.variant];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 shadow-elevation-2 bg-surface animate-slide-up',
              config.bgClass
            )}
            role="alert"
          >
            <Icon className={cn('h-5 w-5 shrink-0', config.iconClass)} />
            <div className="flex-1 min-w-0">
              <p className="text-body text-charcoal">{toast.message}</p>
              {toast.action && (
                <button
                  className="mt-1 text-body-sm font-medium text-sage hover:text-sage/80"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              className="shrink-0 text-[var(--color-text-tertiary)] hover:text-charcoal"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

### `components/providers/index.tsx`
```typescript
'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';
import { AuthProvider } from '@/contexts/auth-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
```

### Update `app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-primary',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Haven Hub - Marketing Operations Platform',
  description: 'Comprehensive marketing operations platform for Haven & Hold',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-canvas text-charcoal font-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### `lib/navigation.ts`
```typescript
import {
  LayoutDashboard,
  Inbox,
  Quote,
  Image,
  Pin,
  Megaphone,
  FlaskConical,
  HelpCircle,
  Layers,
  MousePointerClick,
  Users,
  UserPlus,
  Gift,
  Ticket,
  BarChart3,
  Calendar,
  Link as LinkIcon,
  Share2,
  Settings,
  Heart,
  ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    queryKey: string[];
    getValue: (data: unknown) => number;
  };
}

export interface NavSection {
  name: string;
  items: NavItem[];
}

export const navigation: (NavItem | NavSection)[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Approvals',
    href: '/dashboard/approval-queue',
    icon: Inbox,
    badge: {
      queryKey: ['approval-counts'],
      getValue: (data: unknown) => {
        if (data && typeof data === 'object' && 'total' in data) {
          return (data as { total: number }).total;
        }
        return 0;
      },
    },
  },
  {
    name: 'Create',
    items: [
      { name: 'Quotes', href: '/dashboard/quotes', icon: Quote },
      { name: 'Assets', href: '/dashboard/assets', icon: Image },
    ],
  },
  {
    name: 'Pinterest',
    items: [
      { name: 'Manager', href: '/dashboard/pinterest', icon: Pin },
      { name: 'Ads', href: '/dashboard/pinterest/ads', icon: Megaphone },
      { name: 'Tests', href: '/dashboard/pinterest/tests', icon: FlaskConical },
    ],
  },
  {
    name: 'Leads',
    items: [
      { name: 'Quiz', href: '/dashboard/leads/quiz', icon: HelpCircle },
      { name: 'Landing Pages', href: '/dashboard/leads/landing-pages', icon: Layers },
      { name: 'Popups', href: '/dashboard/leads/popups', icon: MousePointerClick },
      { name: 'Abandonment', href: '/dashboard/leads/abandonment', icon: ShoppingBag },
    ],
  },
  {
    name: 'Customers',
    items: [
      { name: 'All', href: '/dashboard/customers', icon: Users },
      { name: 'Referrals', href: '/dashboard/customers/referrals', icon: UserPlus },
      { name: 'Win-Back', href: '/dashboard/customers/win-back', icon: Heart },
      { name: 'Gifts', href: '/dashboard/customers/gifts', icon: Gift },
    ],
  },
  {
    name: 'Campaigns',
    items: [
      { name: 'All', href: '/dashboard/campaigns', icon: Megaphone },
      { name: 'Coupons', href: '/dashboard/campaigns/coupons', icon: Ticket },
      { name: 'Calendar', href: '/dashboard/campaigns/calendar', icon: Calendar },
    ],
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Attribution', href: '/dashboard/analytics/attribution', icon: BarChart3 },
      { name: 'Collections', href: '/dashboard/analytics/collections', icon: Layers },
    ],
  },
  {
    name: 'Content',
    items: [
      { name: 'Link-in-Bio', href: '/dashboard/content/link-in-bio', icon: LinkIcon },
      { name: 'Cross-Platform', href: '/dashboard/content/cross-platform', icon: Share2 },
    ],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function isNavSection(item: NavItem | NavSection): item is NavSection {
  return 'items' in item;
}
```

### `components/layout/sidebar.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { navigation, isNavSection, type NavItem, type NavSection } from '@/lib/navigation';
import { Badge, Button } from '@/components/ui';
import { useAuthContext } from '@/contexts/auth-context';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const pathname = usePathname();
  const { user, signOut } = useAuthContext();

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-surface transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/dashboard" className="text-h3 font-semibold text-charcoal">
              Haven Hub
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleToggle}
            className={cn(collapsed && 'mx-auto')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <ul className="space-y-1">
            {navigation.map((item, index) => {
              if (isNavSection(item)) {
                return (
                  <NavSectionComponent
                    key={item.name}
                    section={item}
                    collapsed={collapsed}
                    pathname={pathname}
                  />
                );
              }
              return (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-md p-2',
              collapsed ? 'justify-center' : ''
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-white text-body-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-body-sm font-medium">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSectionComponent({
  section,
  collapsed,
  pathname,
}: {
  section: NavSection;
  collapsed: boolean;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(true);

  if (collapsed) {
    return (
      <>
        {section.items.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}
      </>
    );
  }

  return (
    <li>
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-overline text-[var(--color-text-tertiary)] uppercase tracking-wider"
        onClick={() => setExpanded(!expanded)}
      >
        {section.name}
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1">
          {section.items.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavItemComponent({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  // Fetch badge data if configured
  const { data: badgeData } = useQuery({
    queryKey: item.badge?.queryKey ?? [],
    enabled: !!item.badge,
    refetchInterval: 30000,
  });

  const badgeCount = item.badge?.getValue(badgeData) ?? 0;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors',
          isActive
            ? 'bg-sage-pale text-sage font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-elevated hover:text-charcoal',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.name : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {badgeCount > 0 && (
              <Badge variant="primary" size="sm">
                {badgeCount}
              </Badge>
            )}
          </>
        )}
        {collapsed && badgeCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sage" />
        )}
      </Link>
    </li>
  );
}
```

### `components/layout/header.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Search, Bell, Menu, Command } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [notificationCount] = useState(3); // Will be connected to real data

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search trigger */}
        <button
          className="hidden md:flex items-center gap-2 rounded-md border bg-elevated px-3 py-1.5 text-body-sm text-[var(--color-text-tertiary)] hover:border-sage/50 transition-colors"
          onClick={() => {
            // Will open command palette
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-4 hidden sm:inline-flex items-center gap-1 rounded border bg-surface px-1.5 text-caption">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Mode indicator - will be replaced with actual component */}
        <Badge variant="secondary" className="hidden sm:flex">
          Supervised
        </Badge>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-medium text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
```

### `components/layout/page-container.tsx`
```typescript
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
  fullWidth = false,
}: PageContainerProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-h1 text-charcoal">{title}</h1>
          {description && (
            <p className="mt-1 text-body text-[var(--color-text-secondary)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Page content */}
      <div className={cn(!fullWidth && 'max-w-7xl')}>{children}</div>
    </div>
  );
}
```

### `app/(dashboard)/layout.tsx`
```typescript
'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Sheet } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        side="left"
        size="sm"
        showCloseButton={false}
      >
        <Sidebar />
      </Sheet>

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300',
          'lg:ml-64' // Will need to be dynamic based on collapsed state
        )}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
```

### `app/(dashboard)/page.tsx`
```typescript
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent } from '@/components/ui';

export default function DashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      description="Welcome to Haven Hub"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder metric cards */}
        <Card>
          <CardContent className="p-6">
            <p className="text-overline text-[var(--color-text-tertiary)] uppercase">
              Pending Approvals
            </p>
            <p className="text-metric mt-2">0</p>
            <p className="text-body-sm text-success mt-1">All caught up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-overline text-[var(--color-text-tertiary)] uppercase">
              Pins Today
            </p>
            <p className="text-metric mt-2">0 / 5</p>
            <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">Daily limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-overline text-[var(--color-text-tertiary)] uppercase">
              Ad Spend This Week
            </p>
            <p className="text-metric mt-2">$0.00</p>
            <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">$100 limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-overline text-[var(--color-text-tertiary)] uppercase">
              Mockup Credits
            </p>
            <p className="text-metric mt-2">3,500</p>
            <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">Annual budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder content sections */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Approval Queue" />
          <CardContent className="p-6 pt-0">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <span className="text-success text-xl">✓</span>
              </div>
              <p className="text-body font-medium">All caught up!</p>
              <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                No items waiting for review
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Today's Schedule" />
          <CardContent className="p-6 pt-0">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-body text-[var(--color-text-secondary)]">
                No content scheduled for today
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
```

### `lib/fetcher.ts`
```typescript
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function fetcher<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Get session for auth header
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || errorData.error || `HTTP error ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, params?: FetchOptions['params']) =>
    fetcher<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    fetcher<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    fetcher<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    fetcher<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => fetcher<T>(endpoint, { method: 'DELETE' }),
};
```

### `components/error-boundary.tsx`
```typescript
'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-error" />
            </div>
            <h3 className="text-h3 mb-2">Something went wrong</h3>
            <p className="text-body text-[var(--color-text-secondary)] mb-4 max-w-md">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Try again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

- **Step Dependencies**: Step 1.9
- **User Instructions**: None

---

**Phase 1 Complete!**

Now continuing with **Phase 2: Core System Infrastructure** in the same file...

---

# Phase 2: Core System Infrastructure

## Step 2.1: Create Core Database Schema - User Settings

- **Task**: Create the Supabase migration for user_settings table with operator mode, guardrails, and setup tracking per Feature 1 spec.

- **Files**:

### `supabase/migrations/001_user_settings.sql`
```sql
-- ============================================================================
-- Migration: 001_user_settings
-- Description: Core user settings table with operator mode, guardrails, and setup tracking
-- Feature: 1 (Operator Mode System), 3 (Setup Wizard), 6 (Daily Digest)
-- ============================================================================

-- Create updated_at trigger function (reusable for all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- User Settings Table
-- ============================================================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Operator Mode (Feature 1)
  -- supervised: all actions require approval
  -- assisted: only high-risk actions require approval
  -- autopilot: automatic execution within guardrails
  global_mode TEXT NOT NULL DEFAULT 'supervised' 
    CHECK (global_mode IN ('supervised', 'assisted', 'autopilot')),
  
  -- Module-specific overrides (e.g., {"pinterest": "autopilot", "mockups": "supervised"})
  module_overrides JSONB NOT NULL DEFAULT '{}',
  
  -- Grace period tracking for mode transitions
  transitioning_to TEXT CHECK (transitioning_to IN ('supervised', 'assisted', 'autopilot')),
  transition_started_at TIMESTAMPTZ,
  
  -- Guardrails with spec-defined defaults (Feature 1)
  guardrails JSONB NOT NULL DEFAULT '{
    "daily_pin_limit": 5,
    "weekly_ad_spend_cap": 100,
    "monthly_ad_spend_cap": null,
    "annual_mockup_budget": 3500,
    "monthly_mockup_soft_limit": 292,
    "auto_retire_days": 7,
    "abandonment_window_hours": 1,
    "duplicate_content_days": 30
  }',
  
  -- Timezone for scheduling and digest emails
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Setup Wizard Progress (Feature 3)
  -- Values: 'pending', 'in_progress', 'completed', 'skipped'
  setup_progress JSONB NOT NULL DEFAULT '{
    "shopify": "pending",
    "pinterest": "pending",
    "klaviyo": "pending",
    "dynamic_mockups": "pending",
    "resend": "pending",
    "design_rules": "pending",
    "operator_mode": "pending",
    "import": "pending"
  }',
  setup_completed_at TIMESTAMPTZ,
  
  -- Daily Digest Preferences (Feature 6)
  -- send_hour: 6-10 (user's timezone)
  -- frequency: 'daily', 'weekdays', 'weekly'
  digest_preferences JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "send_hour": 7,
    "frequency": "daily",
    "sections": {
      "metrics": true,
      "scheduled_content": true,
      "overnight_activity": true,
      "pending_approvals": true,
      "ad_spend": true,
      "alerts": true,
      "mockup_credits": true
    }
  }',
  
  -- General notification preferences
  notification_preferences JSONB NOT NULL DEFAULT '{
    "email_alerts": true,
    "alert_delivery": "immediate",
    "retry_failure_notifications": true
  }',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user lookup
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Updated at trigger
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own settings
CREATE POLICY user_settings_select ON user_settings
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own settings
CREATE POLICY user_settings_insert ON user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own settings
CREATE POLICY user_settings_update ON user_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own settings
CREATE POLICY user_settings_delete ON user_settings
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Auto-create settings on user creation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_settings();

-- ============================================================================
-- Helper function to get effective mode for a module
-- ============================================================================
CREATE OR REPLACE FUNCTION get_effective_mode(
  p_user_id UUID,
  p_module TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_global_mode TEXT;
  v_module_override TEXT;
  v_result TEXT;
BEGIN
  SELECT 
    global_mode,
    module_overrides->>p_module
  INTO v_global_mode, v_module_override
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Return module override if set, otherwise global mode
  v_result := COALESCE(v_module_override, v_global_mode, 'supervised');
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function to check guardrail
-- ============================================================================
CREATE OR REPLACE FUNCTION check_guardrail(
  p_user_id UUID,
  p_guardrail_key TEXT,
  p_current_value NUMERIC
)
RETURNS TABLE (
  allowed BOOLEAN,
  limit_value NUMERIC,
  remaining NUMERIC
) AS $$
DECLARE
  v_limit NUMERIC;
BEGIN
  SELECT (guardrails->>p_guardrail_key)::NUMERIC
  INTO v_limit
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- If limit is null, no restriction
  IF v_limit IS NULL THEN
    RETURN QUERY SELECT true, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;
  
  -- Check if within limit
  RETURN QUERY SELECT 
    p_current_value < v_limit,
    v_limit,
    GREATEST(v_limit - p_current_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/database.ts` (add to existing)
```typescript
// Add these types to the existing types/database.ts file

export type OperatorMode = 'supervised' | 'assisted' | 'autopilot';

export type SetupStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ModuleOverrides {
  pinterest?: OperatorMode;
  design_engine?: OperatorMode;
  mockups?: OperatorMode;
  ads?: OperatorMode;
  products?: OperatorMode;
  ugc?: OperatorMode;
}

export interface Guardrails {
  daily_pin_limit: number;
  weekly_ad_spend_cap: number;
  monthly_ad_spend_cap: number | null;
  annual_mockup_budget: number;
  monthly_mockup_soft_limit: number;
  auto_retire_days: number;
  abandonment_window_hours: number;
  duplicate_content_days: number;
}

export interface SetupProgress {
  shopify: SetupStepStatus;
  pinterest: SetupStepStatus;
  klaviyo: SetupStepStatus;
  dynamic_mockups: SetupStepStatus;
  resend: SetupStepStatus;
  design_rules: SetupStepStatus;
  operator_mode: SetupStepStatus;
  import: SetupStepStatus;
}

export interface DigestSections {
  metrics: boolean;
  scheduled_content: boolean;
  overnight_activity: boolean;
  pending_approvals: boolean;
  ad_spend: boolean;
  alerts: boolean;
  mockup_credits: boolean;
}

export interface DigestPreferences {
  enabled: boolean;
  send_hour: number; // 6-10
  frequency: 'daily' | 'weekdays' | 'weekly';
  sections: DigestSections;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  alert_delivery: 'immediate' | 'daily';
  retry_failure_notifications: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  global_mode: OperatorMode;
  module_overrides: ModuleOverrides;
  transitioning_to: OperatorMode | null;
  transition_started_at: string | null;
  guardrails: Guardrails;
  timezone: string;
  setup_progress: SetupProgress;
  setup_completed_at: string | null;
  digest_preferences: DigestPreferences;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

// Guardrail defaults as constants (matching migration)
export const GUARDRAIL_DEFAULTS: Guardrails = {
  daily_pin_limit: 5,
  weekly_ad_spend_cap: 100,
  monthly_ad_spend_cap: null,
  annual_mockup_budget: 3500,
  monthly_mockup_soft_limit: 292,
  auto_retire_days: 7,
  abandonment_window_hours: 1,
  duplicate_content_days: 30,
};
```

- **Step Dependencies**: Step 1.8
- **User Instructions**: 
  1. Create a `supabase` directory in your project root if it doesn't exist
  2. Create a `migrations` subdirectory
  3. Run `npx supabase db push` or paste the SQL into Supabase Dashboard SQL Editor

---

## Step 2.2: Create Core Database Schema - Activity Log

- **Task**: Create the activity_log table for tracking all automated actions and mode changes per Feature 1 audit requirements.

- **Files**:

### `supabase/migrations/002_activity_log.sql`
```sql
-- ============================================================================
-- Migration: 002_activity_log
-- Description: Activity log for audit trail of all automated actions
-- Feature: 1 (Operator Mode System - Audit Trail)
-- ============================================================================

-- ============================================================================
-- Activity Log Table
-- ============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Action classification
  action_type TEXT NOT NULL,
  module TEXT,
  
  -- Action details (varies by action_type)
  details JSONB NOT NULL DEFAULT '{}',
  
  -- Whether action was actually executed or just logged
  -- In Supervised mode, actions are logged but executed = false until approved
  executed BOOLEAN NOT NULL DEFAULT false,
  
  -- What operator mode was active when this action occurred
  operator_mode TEXT NOT NULL CHECK (operator_mode IN ('supervised', 'assisted', 'autopilot')),
  
  -- For configuration changes, track old/new values
  previous_value JSONB,
  new_value JSONB,
  
  -- Reference to related entities (optional)
  reference_id UUID,
  reference_table TEXT,
  
  -- Timestamp (append-only, no updated_at needed)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================

-- Primary query pattern: user's recent activity
CREATE INDEX idx_activity_log_user_created 
  ON activity_log(user_id, created_at DESC);

-- Filter by action type
CREATE INDEX idx_activity_log_action_type
  ON activity_log(user_id, action_type, created_at DESC);

-- Filter by module
CREATE INDEX idx_activity_log_module
  ON activity_log(user_id, module, created_at DESC)
  WHERE module IS NOT NULL;

-- Filter by execution status
CREATE INDEX idx_activity_log_executed
  ON activity_log(user_id, executed, created_at DESC);

-- Find by reference
CREATE INDEX idx_activity_log_reference
  ON activity_log(reference_id, reference_table)
  WHERE reference_id IS NOT NULL;

-- Time-based partitioning hint (for future optimization)
CREATE INDEX idx_activity_log_created_at
  ON activity_log(created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity
CREATE POLICY activity_log_select ON activity_log
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own activity (service role can insert for any user)
CREATE POLICY activity_log_insert ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No update policy - audit log is append-only
-- No delete policy - audit log is immutable

-- ============================================================================
-- Valid action types (for reference, not enforced in DB for flexibility)
-- ============================================================================
COMMENT ON COLUMN activity_log.action_type IS '
Valid action types:
- mode_change: Operator mode changed
- guardrail_update: Guardrail setting changed
- asset_generated: Design engine created asset
- asset_approved: Asset approved from queue
- asset_rejected: Asset rejected from queue
- pin_scheduled: Pin added to schedule
- pin_published: Pin published to Pinterest
- pin_failed: Pin publish failed
- mockup_generated: Mockup created via Dynamic Mockups
- mockup_credits_reserved: Mockup credits reserved
- product_created: Shopify product created
- product_published: Shopify product published
- product_retired: Underperformer retired
- ad_campaign_created: Pinterest ad created
- ad_campaign_paused: Pinterest ad paused
- ad_budget_warning: Ad spend approaching limit
- winner_variation_created: Winner refresh generated variation
- sequence_triggered: Klaviyo sequence triggered
- alert_created: Performance alert created
- alert_sent: Alert notification sent
- integration_connected: Integration OAuth completed
- integration_disconnected: Integration disconnected
- export_created: Data export generated
- retry_queued: Failed operation queued for retry
- retry_resolved: Retried operation succeeded
- retry_failed: Retried operation permanently failed
';

-- ============================================================================
-- Helper function to log activity
-- ============================================================================
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_details JSONB DEFAULT '{}',
  p_executed BOOLEAN DEFAULT false,
  p_module TEXT DEFAULT NULL,
  p_previous_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_table TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_mode TEXT;
  v_log_id UUID;
BEGIN
  -- Get current operator mode
  SELECT global_mode INTO v_mode
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Default to supervised if settings don't exist yet
  v_mode := COALESCE(v_mode, 'supervised');
  
  -- Insert log entry
  INSERT INTO activity_log (
    user_id,
    action_type,
    module,
    details,
    executed,
    operator_mode,
    previous_value,
    new_value,
    reference_id,
    reference_table
  ) VALUES (
    p_user_id,
    p_action_type,
    p_module,
    p_details,
    p_executed,
    v_mode,
    p_previous_value,
    p_new_value,
    p_reference_id,
    p_reference_table
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/activity.ts`
```typescript
// Action type definitions for type-safe activity logging

export type ActionType =
  // Mode & Settings
  | 'mode_change'
  | 'guardrail_update'
  // Design Engine
  | 'asset_generated'
  | 'asset_approved'
  | 'asset_rejected'
  // Pinterest
  | 'pin_scheduled'
  | 'pin_published'
  | 'pin_failed'
  // Mockups
  | 'mockup_generated'
  | 'mockup_credits_reserved'
  // Products
  | 'product_created'
  | 'product_published'
  | 'product_retired'
  // Ads
  | 'ad_campaign_created'
  | 'ad_campaign_paused'
  | 'ad_budget_warning'
  // Analytics
  | 'winner_variation_created'
  // Customer Journey
  | 'sequence_triggered'
  // Alerts
  | 'alert_created'
  | 'alert_sent'
  // Integrations
  | 'integration_connected'
  | 'integration_disconnected'
  // Export
  | 'export_created'
  // Retry
  | 'retry_queued'
  | 'retry_resolved'
  | 'retry_failed';

export type Module =
  | 'pinterest'
  | 'design_engine'
  | 'mockups'
  | 'ads'
  | 'products'
  | 'ugc'
  | 'quiz'
  | 'leads'
  | 'customers'
  | 'campaigns'
  | 'settings';

// Type-safe detail structures for each action type
export interface ModeChangeDetails {
  from: string;
  to: string;
  gracePeriodUsed: boolean;
  pendingOperationsCount?: number;
}

export interface GuardrailUpdateDetails {
  guardrailKey: string;
  from: number | null;
  to: number | null;
}

export interface AssetGeneratedDetails {
  quoteId: string;
  assetCount: number;
  formats: string[];
  qualityScores: Record<string, number>;
  autoApproved: boolean;
}

export interface AssetApprovedDetails {
  assetId: string;
  quoteId: string;
  format: string;
}

export interface PinScheduledDetails {
  pinId: string;
  boardId: string;
  boardName: string;
  scheduledTime: string;
  copyVariantUsed?: string;
}

export interface PinPublishedDetails {
  pinId: string;
  pinterestPinId: string;
  boardId: string;
}

export interface PinFailedDetails {
  pinId: string;
  error: string;
  retryQueued: boolean;
}

export interface MockupGeneratedDetails {
  mockupId: string;
  quoteId: string;
  scene: string;
  creditsUsed: number;
}

export interface ProductCreatedDetails {
  productId: string;
  shopifyProductId: string;
  quoteId: string;
  collection: string;
  status: 'draft' | 'active';
}

export interface SequenceTriggeredDetails {
  sequenceType: 'quiz_completion' | 'cart_abandonment' | 'post_purchase' | 'win_back' | 'lead_nurturing';
  customerId?: string;
  email: string;
  klaviyoFlowId: string;
}

export interface AlertCreatedDetails {
  alertType: string;
  threshold: string;
  currentValue: number;
  entityId?: string;
  entityType?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  module: Module | null;
  details: Record<string, unknown>;
  executed: boolean;
  operator_mode: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reference_id: string | null;
  reference_table: string | null;
  created_at: string;
}
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: Run `npx supabase db push` or apply migration via SQL Editor

---

## Step 2.3: Set Up Upstash Redis Client

- **Task**: Configure Upstash Redis client for caching layer with helper functions and rate limiting.

- **Files**:

### `lib/cache/redis.ts`
```typescript
import { Redis } from '@upstash/redis';

// Ensure environment variables are set
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Caching will be disabled.');
}

// Create Redis client (will throw if credentials missing in production)
export const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export default redis;

// Check if Redis is available
export function isRedisAvailable(): boolean {
  return redis !== null;
}
```

### `lib/cache/cache-utils.ts`
```typescript
import redis from './redis';

// TTL constants in seconds
export const TTL = {
  VERY_SHORT: 30,      // 30 seconds
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
  
  // Feature-specific TTLs
  USER_SETTINGS: 60,   // 1 minute (frequently accessed, may change)
  DESIGN_RULES: 3600,  // 1 hour (rarely changes)
  BOARDS: 300,         // 5 minutes (synced periodically)
  INTEGRATION_STATUS: 60, // 1 minute
  APPROVAL_COUNTS: 30, // 30 seconds (real-time-ish)
} as const;

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  USER_SETTINGS: 'user_settings',
  DESIGN_RULES: 'design_rules',
  BOARDS: 'boards',
  APPROVAL_COUNTS: 'approval_counts',
  PIN_SCHEDULE: 'pin_schedule',
  RATE_LIMIT: 'rate_limit',
  INTEGRATION: 'integration',
  DAILY_METRICS: 'daily_metrics',
} as const;

/**
 * Build a cache key from prefix and parts
 */
export function cacheKey(prefix: string, ...parts: (string | number)[]): string {
  return [prefix, ...parts].join(':');
}

/**
 * Get a value from cache, or fetch and cache it if not present
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.MEDIUM
): Promise<T> {
  if (!redis) {
    // Redis not available, just fetch
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const value = await fetcher();

    // Cache it (don't await to avoid blocking)
    redis.setex(key, ttlSeconds, value).catch((err) => {
      console.error(`Failed to cache key ${key}:`, err);
    });

    return value;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Fall back to fetcher on cache error
    return fetcher();
  }
}

/**
 * Get a value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number = TTL.MEDIUM
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, value);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete a key from cache
 */
export async function invalidate(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache invalidate error for key ${key}:`, error);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Invalidate all cache keys for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await invalidatePattern(`*:${userId}:*`);
  await invalidatePattern(`*:${userId}`);
}

/**
 * Increment a counter (useful for rate limiting, usage tracking)
 */
export async function increment(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  if (!redis) return 0;

  try {
    const newValue = await redis.incr(key);
    if (ttlSeconds && newValue === 1) {
      // Set expiry only on first increment
      await redis.expire(key, ttlSeconds);
    }
    return newValue;
  } catch (error) {
    console.error(`Cache increment error for key ${key}:`, error);
    return 0;
  }
}

/**
 * Get current counter value
 */
export async function getCounter(key: string): Promise<number> {
  if (!redis) return 0;

  try {
    const value = await redis.get<number>(key);
    return value ?? 0;
  } catch (error) {
    console.error(`Cache getCounter error for key ${key}:`, error);
    return 0;
  }
}
```

### `lib/cache/rate-limiter.ts`
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import redis from './redis';

// Only create rate limiters if Redis is available
const createRateLimiter = (
  config: { requests: number; window: `${number} ${'s' | 'm' | 'h' | 'd'}` },
  prefix: string
) => {
  if (!redis) return null;
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  });
};

// API rate limiters
export const apiLimiter = createRateLimiter(
  { requests: 100, window: '1 m' },
  'api'
);

// Public endpoint rate limiters (more restrictive)
export const publicApiLimiter = createRateLimiter(
  { requests: 30, window: '1 m' },
  'public'
);

// Quiz submission rate limiter
export const quizLimiter = createRateLimiter(
  { requests: 10, window: '1 m' },
  'quiz'
);

// Webhook rate limiter (higher limit for incoming webhooks)
export const webhookLimiter = createRateLimiter(
  { requests: 1000, window: '1 m' },
  'webhook'
);

// Export rate limiter
export const exportLimiter = createRateLimiter(
  { requests: 5, window: '1 h' },
  'export'
);

// Pinterest API rate limiter (per spec: 100 requests/min for pins)
export const pinterestLimiter = createRateLimiter(
  { requests: 90, window: '1 m' }, // Leave 10% buffer
  'pinterest'
);

/**
 * Check rate limit and return result
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!limiter) {
    // No rate limiting if Redis unavailable
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Rate limit middleware helper for API routes
 */
export async function rateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<Response | null> {
  const result = await checkRateLimit(limiter, identifier);
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset),
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }
  
  return null; // No rate limit hit
}
```

- **Step Dependencies**: Step 1.1
- **User Instructions**: 
  1. Create an Upstash Redis database at console.upstash.com
  2. Copy the REST URL and Token to `.env.local`

---

*[Continuing with Steps 2.4-2.6 and Phases 3-4 in the same document...]*

Due to length, I'll continue in the next part. This Part 2 covers:
- Steps 1.8-1.10: Supabase setup, Authentication (full code), Dashboard layout
- Steps 2.1-2.3: User settings migration, Activity log migration, Redis cache

**Next: Part 3 will continue with Steps 2.4-2.6 (R2 Storage, Trigger.dev, Cron), Phase 3 (Operator Mode), and Phase 4 (Approval Queue)**
