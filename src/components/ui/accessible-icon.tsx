import { ReactNode } from 'react';
import { VisuallyHidden } from './visually-hidden';

interface AccessibleIconProps {
  children: ReactNode;
  label: string;
}

export function AccessibleIcon({ children, label }: AccessibleIconProps) {
  return (
    <span role="img" aria-label={label}>
      {children}
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
