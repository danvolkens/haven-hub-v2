import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-md text-body font-medium
   cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
   focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        primary: 'bg-sage text-white hover:bg-sage/90 active:bg-sage/80',
        secondary: 'border border-sage text-sage bg-transparent hover:bg-sage/10 active:bg-sage/20',
        ghost: 'text-charcoal hover:bg-elevated active:bg-elevated/80',
        destructive: 'bg-error text-white hover:bg-error/90 active:bg-error/80',
        link: 'text-sage underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm gap-1.5',
        md: 'h-10 px-4 gap-2',
        lg: 'h-12 px-6 text-body-lg gap-2.5',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size?.startsWith('icon');

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {!isIconOnly && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
