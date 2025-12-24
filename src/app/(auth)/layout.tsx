import type { ReactNode } from 'react';

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
