import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, leftIcon, rightIcon, onRightIconClick, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              `flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-body
               placeholder:text-[var(--color-text-tertiary)]
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
               disabled:cursor-not-allowed disabled:opacity-50
               read-only:bg-elevated read-only:cursor-default`,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError && 'border-error focus-visible:ring-error',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]',
                onRightIconClick && 'cursor-pointer hover:text-charcoal'
              )}
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-caption text-error" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-caption text-[var(--color-text-secondary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
