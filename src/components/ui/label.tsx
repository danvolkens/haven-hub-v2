import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-body-sm font-medium text-charcoal peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-error">*</span>}
        {optional && (
          <span className="ml-1 text-caption text-[var(--color-text-tertiary)]">(optional)</span>
        )}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
