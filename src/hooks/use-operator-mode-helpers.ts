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
