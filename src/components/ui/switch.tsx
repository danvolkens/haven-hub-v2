import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  labelPosition?: 'left' | 'right';
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, labelPosition = 'right', id, ...props }, ref) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const switchElement = (
      <div className="relative inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          ref={ref}
          id={switchId}
          role="switch"
          className={cn(
            `peer h-6 w-11 cursor-pointer appearance-none rounded-full border-2 border-transparent
             bg-[var(--color-border-strong)] transition-colors
             checked:bg-sage
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus focus-visible:ring-offset-2
             disabled:cursor-not-allowed disabled:opacity-50`,
            className
          )}
          {...props}
        />
        <span
          className={cn(
            `pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm
             transition-transform duration-200 ease-in-out
             peer-checked:translate-x-5`
          )}
        />
      </div>
    );

    const labelElement = (label || description) && (
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={switchId}
            className="cursor-pointer text-body font-medium text-charcoal"
          >
            {label}
          </label>
        )}
        {description && (
          <span className="text-body-sm text-[var(--color-text-secondary)]">{description}</span>
        )}
      </div>
    );

    return (
      <div className="flex items-center gap-3">
        {labelPosition === 'left' && labelElement}
        {switchElement}
        {labelPosition === 'right' && labelElement}
      </div>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
