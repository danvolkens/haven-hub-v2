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
