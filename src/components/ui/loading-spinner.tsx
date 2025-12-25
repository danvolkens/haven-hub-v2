import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status">
      <Loader2 className={cn('animate-spin text-sage', sizeClasses[size])} />
      {label && <span className="text-body-sm text-[var(--color-text-secondary)]">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}
