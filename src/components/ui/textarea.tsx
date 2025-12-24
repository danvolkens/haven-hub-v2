import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, showCharCount, maxLength, autoResize, onChange, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(
      typeof props.value === 'string' ? props.value.length : 0
    );
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const hasError = !!error;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);

      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }

      onChange?.(e);
    };

    const setRefs = React.useCallback(
      (element: HTMLTextAreaElement | null) => {
        textareaRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    return (
      <div className="w-full">
        <textarea
          className={cn(
            `flex min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-body
             placeholder:text-[var(--color-text-tertiary)]
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
             disabled:cursor-not-allowed disabled:opacity-50 resize-y`,
            autoResize && 'resize-none overflow-hidden',
            hasError && 'border-error focus-visible:ring-error',
            className
          )}
          ref={setRefs}
          onChange={handleChange}
          maxLength={maxLength}
          aria-invalid={hasError}
          {...props}
        />
        <div className="mt-1.5 flex justify-between">
          <div>
            {error && <p className="text-caption text-error">{error}</p>}
            {!error && helperText && (
              <p className="text-caption text-[var(--color-text-secondary)]">{helperText}</p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p
              className={cn(
                'text-caption text-[var(--color-text-tertiary)]',
                charCount > maxLength * 0.9 && 'text-warning',
                charCount >= maxLength && 'text-error'
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
