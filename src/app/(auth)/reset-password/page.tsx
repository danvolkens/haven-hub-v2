'use client';

import { useState } from 'react';
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
