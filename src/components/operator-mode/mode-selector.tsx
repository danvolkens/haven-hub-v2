'use client';

import { useState } from 'react';
import { Shield, Zap, Sparkles, ChevronDown, Check, AlertTriangle, Clock } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import type { OperatorMode } from '@/types/database';

interface ModeConfig {
  id: OperatorMode;
  name: string;
  description: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  features: string[];
}

const modes: ModeConfig[] = [
  {
    id: 'supervised',
    name: 'Supervised',
    description: 'Review and approve all automated actions before execution',
    icon: Shield,
    color: 'text-info',
    bgColor: 'bg-info/10',
    features: [
      'All actions require approval',
      'Full control over every decision',
      'Best for learning the system',
      'Recommended for new users',
    ],
  },
  {
    id: 'assisted',
    name: 'Assisted',
    description: 'Automatic low-risk actions, approval for high-impact decisions',
    icon: Zap,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    features: [
      'Routine tasks run automatically',
      'High-impact actions need approval',
      'Balance of control and efficiency',
      'Recommended for established workflows',
    ],
  },
  {
    id: 'autopilot',
    name: 'Autopilot',
    description: 'Full automation within configured guardrails',
    icon: Sparkles,
    color: 'text-success',
    bgColor: 'bg-success/10',
    features: [
      'All actions run automatically',
      'Guardrails prevent overspending',
      'Real-time alerts for issues',
      'Best for optimized workflows',
    ],
  },
];

export function ModeSelector() {
  const {
    globalMode,
    gracePeriod,
    setGlobalMode,
    forceCompleteGracePeriod,
    cancelGracePeriod,
  } = useOperatorMode();

  const [isOpen, setIsOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<OperatorMode | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gracePeriodModalOpen, setGracePeriodModalOpen] = useState(false);

  const currentMode = modes.find((m) => m.id === globalMode)!;
  const CurrentIcon = currentMode.icon;

  const handleModeSelect = async (mode: OperatorMode) => {
    if (mode === globalMode) {
      setIsOpen(false);
      return;
    }

    setPendingMode(mode);
    setIsConfirmOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!pendingMode) return;

    setIsLoading(true);
    const result = await setGlobalMode(pendingMode);
    setIsLoading(false);

    setIsConfirmOpen(false);
    setIsOpen(false);

    if (result.gracePeriod) {
      setGracePeriodModalOpen(true);
    }

    setPendingMode(null);
  };

  const handleForceComplete = async () => {
    setIsLoading(true);
    await forceCompleteGracePeriod();
    setIsLoading(false);
    setGracePeriodModalOpen(false);
  };

  const handleCancelGracePeriod = async () => {
    setIsLoading(true);
    await cancelGracePeriod();
    setIsLoading(false);
    setGracePeriodModalOpen(false);
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors',
            currentMode.bgColor,
            currentMode.color,
            'hover:opacity-80'
          )}
        >
          <CurrentIcon className="h-4 w-4" />
          <span>{currentMode.name}</span>
          {gracePeriod.isActive && (
            <Clock className="h-3 w-3 animate-pulse" />
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border bg-surface shadow-elevation-3 animate-fade-in">
              <div className="p-2">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = mode.id === globalMode;
                  const isTarget = gracePeriod.isActive && gracePeriod.targetMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors',
                        isSelected ? 'bg-sage-pale' : 'hover:bg-elevated',
                        isTarget && 'ring-2 ring-warning ring-offset-2'
                      )}
                    >
                      <div className={cn('rounded-md p-2', mode.bgColor)}>
                        <Icon className={cn('h-5 w-5', mode.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{mode.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-sage" />}
                          {isTarget && (
                            <Badge variant="secondary" size="sm">Transitioning</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-body-sm text-[var(--color-text-secondary)]">
                          {mode.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {gracePeriod.isActive && (
                <div className="border-t p-3">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-body-sm font-medium">Grace period active</span>
                  </div>
                  <p className="text-caption text-[var(--color-text-secondary)] mb-2">
                    {gracePeriod.pendingCount} operation(s) in progress. Mode will change when complete.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGracePeriodModalOpen(true)}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingMode(null);
        }}
        onConfirm={handleConfirmChange}
        title="Change Operator Mode?"
        message={
          pendingMode
            ? `You're about to switch to ${modes.find((m) => m.id === pendingMode)?.name} mode. This will change how automated actions are handled across all modules.`
            : ''
        }
        confirmText="Change Mode"
        isLoading={isLoading}
      />

      {/* Grace Period Modal */}
      <Modal
        isOpen={gracePeriodModalOpen}
        onClose={() => setGracePeriodModalOpen(false)}
        title="Grace Period Active"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleCancelGracePeriod} isLoading={isLoading}>
              Cancel Change
            </Button>
            <Button variant="primary" onClick={handleForceComplete} isLoading={isLoading}>
              Switch Now
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-warning/10 border border-warning/20 p-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-body font-medium">Operations in progress</p>
              <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                There are <strong>{gracePeriod.pendingCount}</strong> operations currently being processed.
                The mode change will automatically complete when these finish.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              <strong>Current mode:</strong> {modes.find((m) => m.id === globalMode)?.name}
            </p>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              <strong>Target mode:</strong> {modes.find((m) => m.id === gracePeriod.targetMode)?.name}
            </p>
            {gracePeriod.startedAt && (
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                <strong>Started:</strong> {gracePeriod.startedAt.toLocaleString()}
              </p>
            )}
          </div>

          <div className="text-body-sm text-[var(--color-text-tertiary)]">
            <p><strong>Switch Now:</strong> Immediately change mode (in-flight operations will complete under old mode)</p>
            <p><strong>Cancel Change:</strong> Stay in current mode</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
