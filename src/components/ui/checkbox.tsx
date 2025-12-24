import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, indeterminate, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    const setRefs = React.useCallback(
      (element: HTMLInputElement | null) => {
        inputRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            ref={setRefs}
            id={checkboxId}
            className={cn(
              `peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border
               bg-surface transition-colors
               checked:border-sage checked:bg-sage
               indeterminate:border-sage indeterminate:bg-sage
               hover:border-sage/70
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus focus-visible:ring-offset-2
               disabled:cursor-not-allowed disabled:opacity-50`,
              className
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
          <Minus
            className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-indeterminate:opacity-100"
            strokeWidth={3}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className="cursor-pointer text-body font-medium text-charcoal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-body-sm text-[var(--color-text-secondary)]">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
