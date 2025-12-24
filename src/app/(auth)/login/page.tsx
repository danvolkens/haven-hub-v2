'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Label } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
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
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-100 rounded-md" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-100 rounded-md" />
      </div>
      <div className="h-10 bg-gray-200 rounded-md" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-h1 text-charcoal">Welcome back</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Sign in to your account to continue
        </p>
      </div>

      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-body-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-sage hover:text-sage/80 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
