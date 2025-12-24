## Step 3.1: Implement Operator Mode Context and Provider

- **Task**: Create the React context for operator mode providing global mode, module overrides, guardrails, and mode-checking utilities.

- **Files**:

### `contexts/operator-mode-context.tsx`
```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  OperatorMode,
  ModuleOverrides,
  Guardrails,
  UserSettings,
} from '@/types/database';
import { GUARDRAIL_DEFAULTS } from '@/lib/constants';

interface GracePeriodState {
  isActive: boolean;
  targetMode: OperatorMode | null;
  startedAt: Date | null;
  pendingCount: number;
}

interface OperatorModeContextValue {
  // Current state
  globalMode: OperatorMode;
  moduleOverrides: ModuleOverrides;
  guardrails: Guardrails;
  gracePeriod: GracePeriodState;
  isLoading: boolean;
  error: Error | null;
  
  // Computed helpers
  getEffectiveMode: (module: string) => OperatorMode;
  requiresApproval: (module: string, isHighRisk?: boolean) => boolean;
  checkGuardrail: (key: keyof Guardrails, currentValue: number) => {
    allowed: boolean;
    limit: number | null;
    remaining: number | null;
    percentage: number;
  };
  
  // Actions
  setGlobalMode: (mode: OperatorMode) => Promise<{
    success: boolean;
    gracePeriod?: boolean;
    pendingCount?: number;
    error?: string;
  }>;
  setModuleOverride: (module: string, mode: OperatorMode | null) => Promise<void>;
  updateGuardrail: (key: keyof Guardrails, value: number | null) => Promise<void>;
  forceCompleteGracePeriod: () => Promise<void>;
  cancelGracePeriod: () => Promise<void>;
}

const OperatorModeContext = createContext<OperatorModeContextValue | null>(null);

const SETTINGS_QUERY_KEY = ['user-settings'];

export function OperatorModeProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const queryClient = useQueryClient();
  
  // Fetch user settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserSettings;
    },
    staleTime: 60000, // 1 minute
  });
  
  // Grace period state
  const [gracePeriod, setGracePeriod] = useState<GracePeriodState>({
    isActive: false,
    targetMode: null,
    startedAt: null,
    pendingCount: 0,
  });
  
  // Sync grace period state from settings
  useEffect(() => {
    if (settings?.transitioning_to) {
      setGracePeriod({
        isActive: true,
        targetMode: settings.transitioning_to as OperatorMode,
        startedAt: settings.transition_started_at ? new Date(settings.transition_started_at) : null,
        pendingCount: 0, // Will be fetched separately
      });
    } else {
      setGracePeriod({
        isActive: false,
        targetMode: null,
        startedAt: null,
        pendingCount: 0,
      });
    }
  }, [settings?.transitioning_to, settings?.transition_started_at]);
  
  // Real-time subscription for settings changes
  useEffect(() => {
    const channel = supabase
      .channel('user-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);
  
  // Get effective mode for a module
  const getEffectiveMode = useCallback(
    (module: string): OperatorMode => {
      if (!settings) return 'supervised';
      const override = settings.module_overrides[module as keyof ModuleOverrides];
      return override || settings.global_mode;
    },
    [settings]
  );
  
  // Check if action requires approval
  const requiresApproval = useCallback(
    (module: string, isHighRisk: boolean = false): boolean => {
      const mode = getEffectiveMode(module);
      if (mode === 'supervised') return true;
      if (mode === 'assisted' && isHighRisk) return true;
      return false;
    },
    [getEffectiveMode]
  );
  
  // Check guardrail
  const checkGuardrail = useCallback(
    (key: keyof Guardrails, currentValue: number) => {
      const guardrails = settings?.guardrails || GUARDRAIL_DEFAULTS;
      const limit = guardrails[key];
      
      if (limit === null || limit === undefined) {
        return { allowed: true, limit: null, remaining: null, percentage: 0 };
      }
      
      const remaining = Math.max(limit - currentValue, 0);
      const percentage = limit > 0 ? (currentValue / limit) * 100 : 0;
      
      return {
        allowed: currentValue < limit,
        limit,
        remaining,
        percentage: Math.min(percentage, 100),
      };
    },
    [settings?.guardrails]
  );
  
  // Mutation: Set global mode
  const setGlobalModeMutation = useMutation({
    mutationFn: async (newMode: OperatorMode) => {
      const response = await fetch('/api/settings/operator-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update mode');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const setGlobalMode = async (mode: OperatorMode) => {
    try {
      const result = await setGlobalModeMutation.mutateAsync(mode);
      return {
        success: true,
        gracePeriod: result.gracePeriod,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
  
  // Mutation: Set module override
  const setModuleOverrideMutation = useMutation({
    mutationFn: async ({ module, mode }: { module: string; mode: OperatorMode | null }) => {
      const response = await fetch('/api/settings/operator-mode/module', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, mode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update module override');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const setModuleOverride = async (module: string, mode: OperatorMode | null) => {
    await setModuleOverrideMutation.mutateAsync({ module, mode });
  };
  
  // Mutation: Update guardrail
  const updateGuardrailMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof Guardrails; value: number | null }) => {
      const response = await fetch('/api/settings/guardrails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update guardrail');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const updateGuardrail = async (key: keyof Guardrails, value: number | null) => {
    await updateGuardrailMutation.mutateAsync({ key, value });
  };
  
  // Force complete grace period
  const forceCompleteGracePeriod = async () => {
    const response = await fetch('/api/settings/operator-mode/grace-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete grace period');
    }
    
    queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  };
  
  // Cancel grace period
  const cancelGracePeriod = async () => {
    const response = await fetch('/api/settings/operator-mode/grace-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel grace period');
    }
    
    queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  };
  
  const value: OperatorModeContextValue = {
    globalMode: settings?.global_mode || 'supervised',
    moduleOverrides: settings?.module_overrides || {},
    guardrails: settings?.guardrails || GUARDRAIL_DEFAULTS,
    gracePeriod,
    isLoading,
    error: error as Error | null,
    
    getEffectiveMode,
    requiresApproval,
    checkGuardrail,
    
    setGlobalMode,
    setModuleOverride,
    updateGuardrail,
    forceCompleteGracePeriod,
    cancelGracePeriod,
  };
  
  return (
    <OperatorModeContext.Provider value={value}>
      {children}
    </OperatorModeContext.Provider>
  );
}

export function useOperatorMode() {
  const context = useContext(OperatorModeContext);
  if (!context) {
    throw new Error('useOperatorMode must be used within an OperatorModeProvider');
  }
  return context;
}
```

### `hooks/use-operator-mode-helpers.ts`
```typescript
import { useOperatorMode } from '@/contexts/operator-mode-context';

/**
 * Convenience hook for common operator mode checks
 */
export function useOperatorModeHelpers() {
  const { globalMode, getEffectiveMode, requiresApproval, checkGuardrail } = useOperatorMode();
  
  return {
    // Global mode checks
    isSupervised: globalMode === 'supervised',
    isAssisted: globalMode === 'assisted',
    isAutopilot: globalMode === 'autopilot',
    
    // Module-specific checks
    isModuleSupervised: (module: string) => getEffectiveMode(module) === 'supervised',
    isModuleAssisted: (module: string) => getEffectiveMode(module) === 'assisted',
    isModuleAutopilot: (module: string) => getEffectiveMode(module) === 'autopilot',
    
    // Approval checks
    needsApproval: requiresApproval,
    
    // Guardrail checks
    isWithinLimit: (key: Parameters<typeof checkGuardrail>[0], value: number) =>
      checkGuardrail(key, value).allowed,
    
    // Combined action check
    canAutoExecute: (module: string, isHighRisk: boolean = false) => {
      return !requiresApproval(module, isHighRisk);
    },
  };
}
```

### Update `components/providers/index.tsx`
```typescript
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
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: None

---

