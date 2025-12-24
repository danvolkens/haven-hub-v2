import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-elevated text-charcoal',
        primary: 'bg-sage text-white',
        secondary: 'bg-sage-pale text-sage',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
        info: 'bg-info/10 text-info',
        // Collection variants
        grounding: 'bg-grounding text-charcoal',
        wholeness: 'bg-wholeness text-charcoal',
        growth: 'bg-growth text-charcoal',
        // Outline variants
        outline: 'border bg-transparent text-charcoal',
        'outline-success': 'border border-success bg-transparent text-success',
        'outline-warning': 'border border-warning bg-transparent text-warning',
        'outline-error': 'border border-error bg-transparent text-error',
      },
      size: {
        sm: 'px-2 py-0.5 text-caption',
        md: 'px-2.5 py-0.5 text-body-sm',
        lg: 'px-3 py-1 text-body',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor || 'currentColor' }}
          />
        )}
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
