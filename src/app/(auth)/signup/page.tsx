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
