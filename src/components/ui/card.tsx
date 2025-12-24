import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hoverable = false, ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const variantClasses = {
      default: 'border bg-surface shadow-elevation-1',
      elevated: 'bg-surface shadow-elevation-2',
      bordered: 'border bg-surface',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && 'transition-shadow hover:shadow-elevation-2',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between gap-4', className)}
        {...props}
      >
        {children || (
          <>
            <div className="space-y-1">
              {title && <h3 className="text-h3">{title}</h3>}
              {description && (
                <p className="text-body-sm text-[var(--color-text-secondary)]">{description}</p>
              )}
            </div>
            {action}
          </>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-end gap-2 border-t pt-4', className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
