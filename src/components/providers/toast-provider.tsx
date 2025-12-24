'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant, action?: Toast['action']) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 5000;
const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', action?: Toast['action']) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((prev) => {
        const newToasts = [...prev, { id, message, variant, action }];
        // Limit to MAX_TOASTS
        if (newToasts.length > MAX_TOASTS) {
          return newToasts.slice(-MAX_TOASTS);
        }
        return newToasts;
      });

      // Auto-dismiss after duration
      setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION);

      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-success/10 border-success/20',
    iconClass: 'text-success',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-error/10 border-error/20',
    iconClass: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-info/10 border-info/20',
    iconClass: 'text-info',
  },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const config = variantConfig[toast.variant];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 shadow-elevation-2 bg-surface animate-slide-up',
              config.bgClass
            )}
            role="alert"
          >
            <Icon className={cn('h-5 w-5 shrink-0', config.iconClass)} />
            <div className="flex-1 min-w-0">
              <p className="text-body text-charcoal">{toast.message}</p>
              {toast.action && (
                <button
                  className="mt-1 text-body-sm font-medium text-sage hover:text-sage/80"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              className="shrink-0 text-[var(--color-text-tertiary)] hover:text-charcoal"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
