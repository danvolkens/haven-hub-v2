'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { OperatorModeProvider } from '@/contexts/operator-mode-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OperatorModeProvider>
          <ToastProvider>{children}</ToastProvider>
        </OperatorModeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
