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
