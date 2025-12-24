# Haven Hub: Complete Implementation Task Plan
## Part 4: Steps 3.3-3.6, Phase 4 (Approval Queue)

---

## Step 3.3: Create Operator Mode Selector Component

- **Task**: Build the mode selector UI with visual hierarchy, grace period handling, and confirmation dialogs.

- **Files**:

### `components/operator-mode/mode-selector.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Shield, Zap, Sparkles, ChevronDown, Check, AlertTriangle, Clock } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Button, Badge, Card, Modal, ConfirmModal } from '@/components/ui';
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
                            <Badge variant="warning" size="sm">Transitioning</Badge>
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
```

### `components/operator-mode/mode-details-panel.tsx`
```typescript
'use client';

import { Shield, Zap, Sparkles, Info } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { OperatorMode } from '@/types/database';

const modeInfo: Record<OperatorMode, {
  name: string;
  icon: typeof Shield;
  color: string;
  description: string;
  approval: {
    assets: string;
    mockups: string;
    pins: string;
    ads: string;
    products: string;
    ugc: string;
  };
}> = {
  supervised: {
    name: 'Supervised',
    icon: Shield,
    color: 'text-info',
    description: 'All actions require your approval before execution.',
    approval: {
      assets: 'Required',
      mockups: 'Required',
      pins: 'Required',
      ads: 'Required',
      products: 'Required',
      ugc: 'Required',
    },
  },
  assisted: {
    name: 'Assisted',
    icon: Zap,
    color: 'text-warning',
    description: 'Low-risk actions run automatically. High-impact decisions need approval.',
    approval: {
      assets: 'High quality auto-approved',
      mockups: 'Auto-approved',
      pins: 'Scheduled pins auto-publish',
      ads: 'Required for spend',
      products: 'Required',
      ugc: 'Required',
    },
  },
  autopilot: {
    name: 'Autopilot',
    icon: Sparkles,
    color: 'text-success',
    description: 'Full automation within guardrails. You\'ll be notified of actions taken.',
    approval: {
      assets: 'Auto-approved',
      mockups: 'Auto-generated',
      pins: 'Auto-scheduled & published',
      ads: 'Auto within budget',
      products: 'Auto-published',
      ugc: 'Auto with moderation',
    },
  },
};

const modules = [
  { key: 'assets', label: 'Design Assets' },
  { key: 'mockups', label: 'Mockups' },
  { key: 'pins', label: 'Pinterest Pins' },
  { key: 'ads', label: 'Pinterest Ads' },
  { key: 'products', label: 'Shopify Products' },
  { key: 'ugc', label: 'UGC Photos' },
] as const;

export function ModeDetailsPanel() {
  const { globalMode, moduleOverrides, getEffectiveMode } = useOperatorMode();
  
  const currentModeInfo = modeInfo[globalMode];
  const Icon = currentModeInfo.icon;

  return (
    <Card>
      <CardHeader
        title="Current Mode"
        description="How automated actions are handled"
      />
      <CardContent className="space-y-4">
        {/* Current Mode */}
        <div className="flex items-center gap-3">
          <div className={cn('rounded-md p-2 bg-elevated')}>
            <Icon className={cn('h-6 w-6', currentModeInfo.color)} />
          </div>
          <div>
            <h3 className="text-h3">{currentModeInfo.name}</h3>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              {currentModeInfo.description}
            </p>
          </div>
        </div>

        {/* Module Breakdown */}
        <div className="space-y-2">
          <h4 className="text-h4 flex items-center gap-2">
            <Info className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            Approval Requirements by Module
          </h4>
          <div className="rounded-md border divide-y">
            {modules.map(({ key, label }) => {
              const effectiveMode = getEffectiveMode(key);
              const hasOverride = key in moduleOverrides;
              const approvalText = modeInfo[effectiveMode].approval[key as keyof typeof modeInfo.supervised.approval];
              
              return (
                <div key={key} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-body">{label}</span>
                    {hasOverride && (
                      <Badge variant="secondary" size="sm">
                        Override
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    'text-body-sm',
                    approvalText === 'Required' ? 'text-info' :
                    approvalText.includes('Auto') ? 'text-success' :
                    'text-warning'
                  )}>
                    {approvalText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- **Step Dependencies**: Step 3.2
- **User Instructions**: None

---

## Step 3.4: Create Guardrails Editor Component

- **Task**: Build the guardrails configuration UI with validation, real-time updates, and usage indicators.

- **Files**:

### `components/operator-mode/guardrails-editor.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Button, Card, CardHeader, CardContent, Input, Label, Badge } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';
import { GUARDRAIL_DEFAULTS } from '@/lib/constants';
import type { Guardrails } from '@/types/database';
import { useToast } from '@/components/providers/toast-provider';

interface GuardrailConfig {
  key: keyof Guardrails;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  format?: (value: number | null) => string;
  usageQueryKey?: string[];
}

const guardrailConfigs: GuardrailConfig[] = [
  {
    key: 'daily_pin_limit',
    label: 'Daily Pin Limit',
    description: 'Maximum pins published per day',
    unit: 'pins',
    min: 1,
    max: 25,
    step: 1,
    usageQueryKey: ['usage', 'daily-pins'],
  },
  {
    key: 'weekly_ad_spend_cap',
    label: 'Weekly Ad Spend Cap',
    description: 'Maximum Pinterest ad spend per week',
    unit: 'USD',
    min: 0,
    max: 10000,
    step: 10,
    format: (v) => v !== null ? formatCurrency(v) : 'No limit',
    usageQueryKey: ['usage', 'weekly-ad-spend'],
  },
  {
    key: 'monthly_ad_spend_cap',
    label: 'Monthly Ad Spend Cap',
    description: 'Maximum Pinterest ad spend per month (optional)',
    unit: 'USD',
    min: 0,
    max: 50000,
    step: 50,
    format: (v) => v !== null ? formatCurrency(v) : 'No limit',
    usageQueryKey: ['usage', 'monthly-ad-spend'],
  },
  {
    key: 'annual_mockup_budget',
    label: 'Annual Mockup Budget',
    description: 'Dynamic Mockups API credits per year',
    unit: 'credits',
    min: 100,
    max: 10000,
    step: 100,
    usageQueryKey: ['usage', 'mockup-credits'],
  },
  {
    key: 'monthly_mockup_soft_limit',
    label: 'Monthly Mockup Soft Limit',
    description: 'Warning threshold for monthly mockup usage (~annual/12)',
    unit: 'credits',
    min: 10,
    max: 1000,
    step: 10,
    usageQueryKey: ['usage', 'monthly-mockups'],
  },
  {
    key: 'auto_retire_days',
    label: 'Auto-Retire Threshold',
    description: 'Days of underperformance before retiring content',
    unit: 'days',
    min: 3,
    max: 30,
    step: 1,
  },
  {
    key: 'abandonment_window_hours',
    label: 'Cart Abandonment Window',
    description: 'Hours before triggering abandonment sequence',
    unit: 'hours',
    min: 1,
    max: 24,
    step: 1,
  },
  {
    key: 'duplicate_content_days',
    label: 'Duplicate Content Protection',
    description: 'Days to prevent re-pinning same content',
    unit: 'days',
    min: 7,
    max: 90,
    step: 7,
  },
];

export function GuardrailsEditor() {
  const { guardrails, updateGuardrail, checkGuardrail } = useOperatorMode();
  const { toast } = useToast();
  
  const [editingKey, setEditingKey] = useState<keyof Guardrails | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (key: keyof Guardrails) => {
    setEditingKey(key);
    const currentValue = guardrails[key];
    setEditValue(currentValue !== null ? String(currentValue) : '');
  };

  const handleSave = async (config: GuardrailConfig) => {
    setIsSaving(true);
    
    try {
      const numValue = editValue === '' ? null : Number(editValue);
      
      // Validate
      if (numValue !== null) {
        if (isNaN(numValue)) {
          toast('Please enter a valid number', 'error');
          setIsSaving(false);
          return;
        }
        if (numValue < config.min || numValue > config.max) {
          toast(`Value must be between ${config.min} and ${config.max}`, 'error');
          setIsSaving(false);
          return;
        }
      }
      
      await updateGuardrail(config.key, numValue);
      toast('Guardrail updated', 'success');
      setEditingKey(null);
    } catch (error) {
      toast('Failed to update guardrail', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (config: GuardrailConfig) => {
    setIsSaving(true);
    try {
      await updateGuardrail(config.key, GUARDRAIL_DEFAULTS[config.key]);
      toast('Guardrail reset to default', 'success');
    } catch (error) {
      toast('Failed to reset guardrail', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Guardrails"
        description="Safety limits that apply regardless of operator mode"
        action={
          <Badge variant="info" size="sm">
            <Info className="h-3 w-3 mr-1" />
            Always enforced
          </Badge>
        }
      />
      <CardContent>
        <div className="space-y-4">
          {guardrailConfigs.map((config) => {
            const currentValue = guardrails[config.key];
            const defaultValue = GUARDRAIL_DEFAULTS[config.key];
            const isModified = currentValue !== defaultValue;
            const isEditing = editingKey === config.key;
            const displayValue = config.format 
              ? config.format(currentValue) 
              : currentValue !== null 
                ? `${currentValue} ${config.unit}`
                : 'No limit';
            
            return (
              <div
                key={config.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium">{config.label}</span>
                    {isModified && (
                      <Badge variant="secondary" size="sm">Modified</Badge>
                    )}
                  </div>
                  <p className="text-body-sm text-[var(--color-text-secondary)] mt-0.5">
                    {config.description}
                  </p>
                  
                  {/* Usage indicator if available */}
                  {config.usageQueryKey && currentValue !== null && (
                    <GuardrailUsage
                      guardrailKey={config.key}
                      limit={currentValue}
                      queryKey={config.usageQueryKey}
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        className="w-32"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave(config)}
                        isLoading={isSaving}
                        leftIcon={<Save className="h-3 w-3" />}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingKey(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-body font-mono">{displayValue}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config.key)}
                      >
                        Edit
                      </Button>
                      {isModified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(config)}
                          leftIcon={<RefreshCw className="h-3 w-3" />}
                        >
                          Reset
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GuardrailUsage({
  guardrailKey,
  limit,
  queryKey,
}: {
  guardrailKey: keyof Guardrails;
  limit: number;
  queryKey: string[];
}) {
  const { data: usage } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/usage/${guardrailKey}`);
      if (!response.ok) return { current: 0 };
      return response.json();
    },
    staleTime: 60000,
  });

  if (!usage) return null;

  const percentage = limit > 0 ? (usage.current / limit) * 100 : 0;
  const isWarning = percentage >= 75;
  const isDanger = percentage >= 90;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-caption mb-1">
        <span className={cn(
          isDanger ? 'text-error' : isWarning ? 'text-warning' : 'text-[var(--color-text-tertiary)]'
        )}>
          {usage.current} / {limit} used ({percentage.toFixed(0)}%)
        </span>
        {isDanger && (
          <span className="flex items-center gap-1 text-error">
            <AlertTriangle className="h-3 w-3" />
            Near limit
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isDanger ? 'bg-error' : isWarning ? 'bg-warning' : 'bg-sage'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

- **Step Dependencies**: Step 3.3
- **User Instructions**: None

---

## Step 3.5: Create Module Override Configuration

- **Task**: Build the UI for configuring per-module operator mode overrides.

- **Files**:

### `components/operator-mode/module-overrides.tsx`
```typescript
'use client';

import { useState } from 'react';
import {
  Image,
  Frame,
  Pin,
  Megaphone,
  ShoppingBag,
  Camera,
  ChevronRight,
  Shield,
  Zap,
  Sparkles,
  X,
} from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Button, Card, CardHeader, CardContent, Badge, Modal, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { OperatorMode } from '@/types/database';
import { useToast } from '@/components/providers/toast-provider';

interface ModuleConfig {
  key: string;
  name: string;
  description: string;
  icon: typeof Image;
  highRiskActions: string[];
}

const moduleConfigs: ModuleConfig[] = [
  {
    key: 'design_engine',
    name: 'Design Engine',
    description: 'Quote-to-asset generation pipeline',
    icon: Image,
    highRiskActions: ['Low quality score generation'],
  },
  {
    key: 'mockups',
    name: 'Mockups',
    description: 'Dynamic Mockups API integration',
    icon: Frame,
    highRiskActions: ['Batch mockup generation'],
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    description: 'Pin scheduling and publishing',
    icon: Pin,
    highRiskActions: ['Publishing pins', 'Board management'],
  },
  {
    key: 'ads',
    name: 'Pinterest Ads',
    description: 'Ad campaign management',
    icon: Megaphone,
    highRiskActions: ['Campaign creation', 'Budget changes', 'Bid adjustments'],
  },
  {
    key: 'products',
    name: 'Shopify Products',
    description: 'Product creation and publishing',
    icon: ShoppingBag,
    highRiskActions: ['Publishing products', 'Price changes', 'Inventory updates'],
  },
  {
    key: 'ugc',
    name: 'UGC Photos',
    description: 'User-generated content moderation',
    icon: Camera,
    highRiskActions: ['Approving customer photos'],
  },
];

const modeOptions = [
  { value: '', label: 'Use Global Mode', description: 'Inherit from global setting' },
  { value: 'supervised', label: 'Supervised', description: 'All actions require approval' },
  { value: 'assisted', label: 'Assisted', description: 'High-risk actions need approval' },
  { value: 'autopilot', label: 'Autopilot', description: 'Full automation' },
];

const modeIcons: Record<OperatorMode, typeof Shield> = {
  supervised: Shield,
  assisted: Zap,
  autopilot: Sparkles,
};

const modeColors: Record<OperatorMode, string> = {
  supervised: 'text-info',
  assisted: 'text-warning',
  autopilot: 'text-success',
};

export function ModuleOverrides() {
  const { globalMode, moduleOverrides, getEffectiveMode, setModuleOverride } = useOperatorMode();
  const { toast } = useToast();
  
  const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOverrideChange = async (moduleKey: string, mode: string) => {
    setIsLoading(true);
    try {
      await setModuleOverride(moduleKey, mode === '' ? null : mode as OperatorMode);
      toast(`${selectedModule?.name} mode updated`, 'success');
    } catch (error) {
      toast('Failed to update module override', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOverride = async (moduleKey: string) => {
    setIsLoading(true);
    try {
      await setModuleOverride(moduleKey, null);
      toast('Override removed', 'success');
    } catch (error) {
      toast('Failed to remove override', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Module Overrides"
          description="Configure different modes for specific modules"
        />
        <CardContent>
          <div className="space-y-2">
            {moduleConfigs.map((module) => {
              const effectiveMode = getEffectiveMode(module.key);
              const hasOverride = module.key in moduleOverrides;
              const Icon = module.icon;
              const ModeIcon = modeIcons[effectiveMode];

              return (
                <button
                  key={module.key}
                  onClick={() => setSelectedModule(module)}
                  className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-elevated"
                >
                  <div className="rounded-md bg-elevated p-2">
                    <Icon className="h-5 w-5 text-charcoal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{module.name}</span>
                      {hasOverride && (
                        <Badge variant="secondary" size="sm">Override</Badge>
                      )}
                    </div>
                    <p className="text-body-sm text-[var(--color-text-secondary)] truncate">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('flex items-center gap-1', modeColors[effectiveMode])}>
                      <ModeIcon className="h-4 w-4" />
                      <span className="text-body-sm capitalize">{effectiveMode}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Module Configuration Modal */}
      <Modal
        isOpen={!!selectedModule}
        onClose={() => setSelectedModule(null)}
        title={selectedModule?.name || ''}
        description={selectedModule?.description}
        size="md"
      >
        {selectedModule && (
          <div className="space-y-4">
            {/* Current Setting */}
            <div>
              <label className="text-body-sm font-medium block mb-2">
                Operator Mode for {selectedModule.name}
              </label>
              <Select
                options={modeOptions.map(opt => ({
                  value: opt.value,
                  label: opt.label,
                  description: opt.value === '' 
                    ? `Currently: ${globalMode.charAt(0).toUpperCase() + globalMode.slice(1)}`
                    : opt.description,
                }))}
                value={moduleOverrides[selectedModule.key as keyof typeof moduleOverrides] || ''}
                onChange={(value) => handleOverrideChange(selectedModule.key, value as string)}
              />
            </div>

            {/* High Risk Actions */}
            {selectedModule.highRiskActions.length > 0 && (
              <div className="rounded-md bg-elevated p-3">
                <h4 className="text-body-sm font-medium mb-2">High-Risk Actions</h4>
                <p className="text-caption text-[var(--color-text-secondary)] mb-2">
                  In Assisted mode, these actions still require approval:
                </p>
                <ul className="space-y-1">
                  {selectedModule.highRiskActions.map((action) => (
                    <li key={action} className="text-body-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Remove Override */}
            {selectedModule.key in moduleOverrides && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  handleRemoveOverride(selectedModule.key);
                  setSelectedModule(null);
                }}
                isLoading={isLoading}
                leftIcon={<X className="h-4 w-4" />}
              >
                Remove Override (Use Global Mode)
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
```

- **Step Dependencies**: Step 3.4
- **User Instructions**: None

---

## Step 3.6: Create Operator Mode Settings Page

- **Task**: Assemble the complete operator mode settings page with all components.

- **Files**:

### `app/(dashboard)/dashboard/settings/operator-mode/page.tsx`
```typescript
import { PageContainer } from '@/components/layout/page-container';
import { ModeSelector } from '@/components/operator-mode/mode-selector';
import { ModeDetailsPanel } from '@/components/operator-mode/mode-details-panel';
import { GuardrailsEditor } from '@/components/operator-mode/guardrails-editor';
import { ModuleOverrides } from '@/components/operator-mode/module-overrides';
import { ActivityLog } from '@/components/operator-mode/activity-log';

export default function OperatorModeSettingsPage() {
  return (
    <PageContainer
      title="Operator Mode"
      description="Configure how Haven Hub handles automated actions"
      actions={<ModeSelector />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ModeDetailsPanel />
          <ModuleOverrides />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <GuardrailsEditor />
          <ActivityLog limit={10} />
        </div>
      </div>
    </PageContainer>
  );
}
```

### `components/operator-mode/activity-log.tsx`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  module: string | null;
  details: Record<string, unknown>;
  executed: boolean;
  operator_mode: string;
  created_at: string;
}

interface ActivityLogProps {
  limit?: number;
  showViewAll?: boolean;
}

const actionLabels: Record<string, string> = {
  mode_change: 'Mode Changed',
  guardrail_update: 'Guardrail Updated',
  asset_generated: 'Asset Generated',
  asset_approved: 'Asset Approved',
  asset_rejected: 'Asset Rejected',
  pin_scheduled: 'Pin Scheduled',
  pin_published: 'Pin Published',
  pin_failed: 'Pin Failed',
  mockup_generated: 'Mockup Generated',
  product_created: 'Product Created',
  product_published: 'Product Published',
  ad_campaign_created: 'Ad Campaign Created',
  ad_budget_warning: 'Budget Warning',
  sequence_triggered: 'Sequence Triggered',
  retry_queued: 'Retry Queued',
  retry_resolved: 'Retry Resolved',
  retry_failed: 'Retry Failed',
};

export function ActivityLog({ limit = 10, showViewAll = true }: ActivityLogProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async () => {
      const response = await fetch(`/api/activity?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json() as Promise<ActivityLogEntry[]>;
    },
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader
        title="Recent Activity"
        description="Actions taken by the system"
        action={
          showViewAll && (
            <Link href="/dashboard/activity">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )
        }
      />
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-elevated" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-elevated" />
                  <div className="h-3 w-1/2 rounded bg-elevated" />
                </div>
              </div>
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <ActivityLogItem key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              No activity yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const label = actionLabels[entry.action_type] || entry.action_type;
  
  const getIcon = () => {
    if (entry.action_type.includes('failed')) {
      return <X className="h-4 w-4 text-error" />;
    }
    if (entry.action_type.includes('warning')) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
    if (entry.executed) {
      return <Check className="h-4 w-4 text-success" />;
    }
    return <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />;
  };

  const getStatusBadge = () => {
    if (!entry.executed) {
      return <Badge variant="secondary" size="sm">Pending</Badge>;
    }
    if (entry.action_type.includes('failed')) {
      return <Badge variant="error" size="sm">Failed</Badge>;
    }
    return null;
  };

  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center',
        entry.executed ? 'bg-success/10' : 'bg-elevated'
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">{label}</span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.module && (
            <Badge variant="outline" size="sm">{entry.module}</Badge>
          )}
          <span className="text-caption text-[var(--color-text-tertiary)]">
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### `app/api/activity/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const module = searchParams.get('module');
    const actionType = searchParams.get('action_type');
    
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (module) {
      query = query.eq('module', module);
    }
    
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 3.5
- **User Instructions**: None

---

# Phase 4: Approval Queue

## Step 4.1: Create Approval Queue Database Schema

- **Task**: Create the database migration for the polymorphic approval queue with all required fields.

- **Files**:

### `supabase/migrations/003_approval_queue.sql`
```sql
-- ============================================================================
-- Migration: 003_approval_queue
-- Description: Polymorphic approval queue for all item types
-- Feature: 2 (Approval Queue System)
-- ============================================================================

-- ============================================================================
-- Approval Items Table
-- ============================================================================
CREATE TABLE approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Item classification
  type TEXT NOT NULL CHECK (type IN ('asset', 'mockup', 'pin', 'ugc', 'product')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped', 'processing')),
  
  -- Reference to actual item
  reference_id UUID NOT NULL,
  reference_table TEXT NOT NULL,
  
  -- Cached payload for quick display (preview data)
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Quality/confidence metrics
  confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Flags that require attention
  flags TEXT[] NOT NULL DEFAULT '{}',
  flag_reasons JSONB NOT NULL DEFAULT '{}',
  
  -- Sorting/filtering
  priority INTEGER NOT NULL DEFAULT 0,
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  
  -- Processing metadata
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- 'user', 'system', 'auto'
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary query: user's pending items ordered by priority/date
CREATE INDEX idx_approval_items_pending 
  ON approval_items(user_id, status, priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Filter by type
CREATE INDEX idx_approval_items_type
  ON approval_items(user_id, type, status, created_at DESC);

-- Filter by collection
CREATE INDEX idx_approval_items_collection
  ON approval_items(user_id, collection, status)
  WHERE collection IS NOT NULL;

-- Find by reference
CREATE INDEX idx_approval_items_reference
  ON approval_items(reference_id, reference_table);

-- Flagged items
CREATE INDEX idx_approval_items_flagged
  ON approval_items(user_id, status)
  WHERE array_length(flags, 1) > 0;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE approval_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_items_select ON approval_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY approval_items_insert ON approval_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY approval_items_update ON approval_items
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY approval_items_delete ON approval_items
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER approval_items_updated_at
  BEFORE UPDATE ON approval_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get approval queue counts by type
-- ============================================================================
CREATE OR REPLACE FUNCTION get_approval_counts(p_user_id UUID)
RETURNS TABLE (
  type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.type,
    COUNT(*)::BIGINT
  FROM approval_items ai
  WHERE ai.user_id = p_user_id
    AND ai.status = 'pending'
  GROUP BY ai.type
  
  UNION ALL
  
  SELECT 
    'total'::TEXT,
    COUNT(*)::BIGINT
  FROM approval_items ai
  WHERE ai.user_id = p_user_id
    AND ai.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Bulk approve items
-- ============================================================================
CREATE OR REPLACE FUNCTION bulk_approve_items(
  p_user_id UUID,
  p_item_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE approval_items
  SET 
    status = 'approved',
    processed_at = NOW(),
    processed_by = 'user'
  WHERE id = ANY(p_item_ids)
    AND user_id = p_user_id
    AND status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Bulk reject items
-- ============================================================================
CREATE OR REPLACE FUNCTION bulk_reject_items(
  p_user_id UUID,
  p_item_ids UUID[],
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE approval_items
  SET 
    status = 'rejected',
    processed_at = NOW(),
    processed_by = 'user',
    rejection_reason = p_reason
  WHERE id = ANY(p_item_ids)
    AND user_id = p_user_id
    AND status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Auto-approve items based on confidence score
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_approve_high_confidence(
  p_user_id UUID,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE approval_items
  SET 
    status = 'approved',
    processed_at = NOW(),
    processed_by = 'system'
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND confidence_score >= p_threshold
    AND array_length(flags, 1) IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/approval.ts`
```typescript
import type { ApprovalItemType, ApprovalStatus } from '@/lib/constants';
import type { Collection } from '@/lib/constants';

export interface ApprovalItem {
  id: string;
  user_id: string;
  type: ApprovalItemType;
  status: ApprovalStatus;
  reference_id: string;
  reference_table: string;
  payload: ApprovalPayload;
  confidence_score: number | null;
  flags: string[];
  flag_reasons: Record<string, string>;
  priority: number;
  collection: Collection | null;
  processed_at: string | null;
  processed_by: 'user' | 'system' | 'auto' | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalPayload =
  | AssetApprovalPayload
  | MockupApprovalPayload
  | PinApprovalPayload
  | UgcApprovalPayload
  | ProductApprovalPayload;

export interface AssetApprovalPayload {
  type: 'asset';
  quoteId: string;
  quoteText: string;
  assetUrl: string;
  thumbnailUrl: string;
  format: string;
  size: string;
  collection: Collection;
  mood: string;
  qualityScores: {
    readability: number;
    contrast: number;
    composition: number;
    overall: number;
  };
}

export interface MockupApprovalPayload {
  type: 'mockup';
  quoteId: string;
  assetId: string;
  mockupUrl: string;
  thumbnailUrl: string;
  scene: string;
  creditsUsed: number;
}

export interface PinApprovalPayload {
  type: 'pin';
  assetUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  boardName: string;
  scheduledTime: string | null;
  copyVariant: string | null;
}

export interface UgcApprovalPayload {
  type: 'ugc';
  photoUrl: string;
  thumbnailUrl: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  productName: string;
  submittedAt: string;
  moderationScore: number | null;
}

export interface ProductApprovalPayload {
  type: 'product';
  title: string;
  description: string;
  price: number;
  images: string[];
  collection: Collection;
  variants: Array<{
    title: string;
    price: number;
    sku: string;
  }>;
}

export interface ApprovalCounts {
  total: number;
  asset: number;
  mockup: number;
  pin: number;
  ugc: number;
  product: number;
}

export type ApprovalAction = 'approve' | 'reject' | 'skip';

export interface ApprovalFilters {
  type?: ApprovalItemType;
  collection?: Collection;
  flagged?: boolean;
}
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: Run migration via Supabase Dashboard or CLI

---

## Step 4.2: Create Approval Queue API Endpoints

- **Task**: Implement API routes for fetching, approving, rejecting, and bulk operations.

- **Files**:

### `app/api/approvals/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const querySchema = z.object({
  type: z.enum(['asset', 'mockup', 'pin', 'ugc', 'product']).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  flagged: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { type, collection, flagged, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('approval_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (collection) {
      query = query.eq('collection', collection);
    }
    
    if (flagged) {
      query = query.not('flags', 'eq', '{}');
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      items: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/approvals/counts/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { getOrSet, cacheKey, CACHE_PREFIX, TTL } from '@/lib/cache/cache-utils';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const counts = await getOrSet(
      cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId),
      async () => {
        const { data, error } = await supabase.rpc('get_approval_counts', {
          p_user_id: userId,
        });
        
        if (error) throw error;
        
        // Transform array to object
        const result: Record<string, number> = {};
        for (const row of data || []) {
          result[row.type] = row.count;
        }
        return result;
      },
      TTL.APPROVAL_COUNTS
    );
    
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/approvals/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'skip']),
  reason: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('approval_items')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { action, reason } = actionSchema.parse(body);
    
    // Map action to status
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      skip: 'skipped',
    };
    
    const { data, error } = await supabase
      .from('approval_items')
      .update({
        status: statusMap[action],
        processed_at: new Date().toISOString(),
        processed_by: 'user',
        rejection_reason: action === 'reject' ? reason : null,
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Item not found or already processed' },
        { status: 404 }
      );
    }
    
    // Invalidate counts cache
    await invalidate(cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId));
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: action === 'approve' ? `${data.type}_approved` : `${data.type}_rejected`,
      p_details: { itemId: params.id, reason },
      p_executed: true,
      p_module: data.type,
      p_reference_id: data.reference_id,
      p_reference_table: data.reference_table,
    });
    
    // TODO: Trigger downstream actions based on approval
    // - If asset approved: queue for mockup generation
    // - If pin approved: queue for scheduling
    // - If product approved: publish to Shopify
    
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/approvals/bulk/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';

const bulkActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { action, itemIds, reason } = bulkActionSchema.parse(body);
    
    let count: number;
    
    if (action === 'approve') {
      const { data } = await supabase.rpc('bulk_approve_items', {
        p_user_id: userId,
        p_item_ids: itemIds,
      });
      count = data || 0;
    } else {
      const { data } = await supabase.rpc('bulk_reject_items', {
        p_user_id: userId,
        p_item_ids: itemIds,
        p_reason: reason,
      });
      count = data || 0;
    }
    
    // Invalidate counts cache
    await invalidate(cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId));
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: `bulk_${action}`,
      p_details: { count, itemIds, reason },
      p_executed: true,
      p_module: 'approval_queue',
    });
    
    return NextResponse.json({
      success: true,
      processed: count,
      action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 4.1
- **User Instructions**: None

---

## Step 4.3: Create Approval Queue List Component

- **Task**: Build the main approval queue list with filtering, selection, and keyboard navigation.

- **Files**:

### `hooks/use-approval-queue.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import type { ApprovalItem, ApprovalCounts, ApprovalFilters, ApprovalAction } from '@/types/approval';

interface ApprovalListResponse {
  items: ApprovalItem[];
  total: number;
  limit: number;
  offset: number;
}

export function useApprovalQueue(filters: ApprovalFilters = {}, limit = 20, offset = 0) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch items
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', filters, limit, offset],
    queryFn: () => api.get<ApprovalListResponse>('/approvals', {
      ...filters,
      limit,
      offset,
    }),
  });

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ['approval-counts'],
    queryFn: () => api.get<ApprovalCounts>('/approvals/counts'),
    refetchInterval: 30000,
  });

  // Single item action
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: ApprovalAction; reason?: string }) => {
      return api.patch(`/approvals/${id}`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Action failed', 'error');
    },
  });

  // Bulk action
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, itemIds, reason }: { action: 'approve' | 'reject'; itemIds: string[]; reason?: string }) => {
      return api.post('/approvals/bulk', { action, itemIds, reason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
      toast(
        `${variables.itemIds.length} items ${variables.action === 'approve' ? 'approved' : 'rejected'}`,
        'success'
      );
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Bulk action failed', 'error');
    },
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    counts: counts ?? { total: 0, asset: 0, mockup: 0, pin: 0, ugc: 0, product: 0 },
    isLoading,
    error,
    refetch,
    
    // Actions
    approve: (id: string) => actionMutation.mutateAsync({ id, action: 'approve' }),
    reject: (id: string, reason?: string) => actionMutation.mutateAsync({ id, action: 'reject', reason }),
    skip: (id: string) => actionMutation.mutateAsync({ id, action: 'skip' }),
    
    // Bulk actions
    bulkApprove: (itemIds: string[]) => bulkActionMutation.mutateAsync({ action: 'approve', itemIds }),
    bulkReject: (itemIds: string[], reason?: string) => bulkActionMutation.mutateAsync({ action: 'reject', itemIds, reason }),
    
    // Loading states
    isActioning: actionMutation.isPending,
    isBulkActioning: bulkActionMutation.isPending,
  };
}
```

### `components/approval-queue/approval-queue-list.tsx`
```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Check,
  X,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApprovalQueue } from '@/hooks/use-approval-queue';
import { Button, Badge, Card, Select, Checkbox } from '@/components/ui';
import { ApprovalItemCard } from './approval-item-card';
import { ApprovalEmptyState } from './approval-empty-state';
import { cn } from '@/lib/utils';
import type { ApprovalItem, ApprovalFilters } from '@/types/approval';

const PAGE_SIZE = 20;

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Assets' },
  { value: 'mockup', label: 'Mockups' },
  { value: 'pin', label: 'Pins' },
  { value: 'ugc', label: 'UGC' },
  { value: 'product', label: 'Products' },
];

const collectionOptions = [
  { value: '', label: 'All Collections' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

export function ApprovalQueueList() {
  const [filters, setFilters] = useState<ApprovalFilters>({});
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  const {
    items,
    total,
    counts,
    isLoading,
    approve,
    reject,
    skip,
    bulkApprove,
    bulkReject,
    isActioning,
    isBulkActioning,
  } = useApprovalQueue(filters, PAGE_SIZE, page * PAGE_SIZE);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0;
  const focusedItem = items[focusedIndex];

  // Reset selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
    setFocusedIndex(0);
  }, [filters, page]);

  // Keyboard navigation
  useHotkeys('j, down', () => {
    setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, { enableOnFormTags: false });

  useHotkeys('k, up', () => {
    setFocusedIndex((prev) => Math.max(prev - 1, 0));
  }, { enableOnFormTags: false });

  useHotkeys('a', () => {
    if (focusedItem && !isActioning) {
      approve(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('r', () => {
    if (focusedItem && !isActioning) {
      reject(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('s', () => {
    if (focusedItem && !isActioning) {
      skip(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('space', (e) => {
    e.preventDefault();
    if (focusedItem) {
      toggleSelection(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('mod+a', (e) => {
    e.preventDefault();
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, { enableOnFormTags: false });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleBulkApprove = async () => {
    await bulkApprove(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    await bulkReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (items.length === 0 && !Object.values(filters).some(Boolean)) {
    return <ApprovalEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Header with counts and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-h2">{counts.total} pending</h2>
          <div className="flex gap-1">
            {counts.asset > 0 && <Badge variant="secondary">{counts.asset} assets</Badge>}
            {counts.mockup > 0 && <Badge variant="secondary">{counts.mockup} mockups</Badge>}
            {counts.pin > 0 && <Badge variant="secondary">{counts.pin} pins</Badge>}
            {counts.ugc > 0 && <Badge variant="secondary">{counts.ugc} UGC</Badge>}
            {counts.product > 0 && <Badge variant="secondary">{counts.product} products</Badge>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            options={typeOptions}
            value={filters.type || ''}
            onChange={(v) => setFilters((prev) => ({ ...prev, type: v as string || undefined }))}
            placeholder="Type"
            className="w-32"
          />
          <Select
            options={collectionOptions}
            value={filters.collection || ''}
            onChange={(v) => setFilters((prev) => ({ ...prev, collection: v as string || undefined }))}
            placeholder="Collection"
            className="w-36"
          />
          <Button
            variant={filters.flagged ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilters((prev) => ({ ...prev, flagged: !prev.flagged }))}
            leftIcon={<AlertTriangle className="h-4 w-4" />}
          >
            Flagged
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleSelectAll}
              />
              <span className="text-body-sm">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkApprove}
                isLoading={isBulkActioning}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Approve All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkReject}
                isLoading={isBulkActioning}
                leftIcon={<X className="h-4 w-4" />}
              >
                Reject All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ApprovalItemCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            isFocused={index === focusedIndex}
            onToggleSelect={() => toggleSelection(item.id)}
            onApprove={() => approve(item.id)}
            onReject={(reason) => reject(item.id, reason)}
            onSkip={() => skip(item.id)}
            isActioning={isActioning}
          />
        ))}
      </div>

      {/* Empty state with filters */}
      {items.length === 0 && Object.values(filters).some(Boolean) && (
        <Card className="p-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            No items match your filters
          </p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setFilters({})}
          >
            Clear filters
          </Button>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <span className="text-body-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-caption text-[var(--color-text-tertiary)]">
        Keyboard: <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">J/K</kbd> navigate
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">A</kbd> approve
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">R</kbd> reject
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">S</kbd> skip
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">Space</kbd> select
      </div>
    </div>
  );
}
```

- **Step Dependencies**: Step 4.2
- **User Instructions**: None

---

## Step 4.4: Create Approval Item Card Component

- **Task**: Build individual approval item cards with type-specific rendering, previews, and actions.

- **Files**:

### `components/approval-queue/approval-item-card.tsx`
```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Check,
  X,
  SkipForward,
  AlertTriangle,
  Image as ImageIcon,
  Frame,
  Pin,
  Camera,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Card, Badge, Checkbox, Modal, Textarea } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ApprovalItem } from '@/types/approval';

interface ApprovalItemCardProps {
  item: ApprovalItem;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  onSkip: () => void;
  isActioning: boolean;
}

const typeIcons = {
  asset: ImageIcon,
  mockup: Frame,
  pin: Pin,
  ugc: Camera,
  product: ShoppingBag,
};

const typeLabels = {
  asset: 'Design Asset',
  mockup: 'Mockup',
  pin: 'Pinterest Pin',
  ugc: 'Customer Photo',
  product: 'Shopify Product',
};

export function ApprovalItemCard({
  item,
  isSelected,
  isFocused,
  onToggleSelect,
  onApprove,
  onReject,
  onSkip,
  isActioning,
}: ApprovalItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const Icon = typeIcons[item.type];
  const hasFlags = item.flags.length > 0;
  const hasThumbnail = item.payload.thumbnailUrl || item.payload.assetUrl || item.payload.photoUrl;

  const handleReject = () => {
    onReject(rejectReason || undefined);
    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all',
          isFocused && 'ring-2 ring-teal-focus',
          isSelected && 'bg-sage-pale/50'
        )}
      >
        <div className="p-4">
          <div className="flex gap-4">
            {/* Selection checkbox */}
            <div className="shrink-0 pt-1">
              <Checkbox checked={isSelected} onChange={onToggleSelect} />
            </div>

            {/* Thumbnail */}
            {hasThumbnail && (
              <div className="shrink-0">
                <div className="relative h-20 w-20 rounded-md overflow-hidden bg-elevated">
                  <Image
                    src={item.payload.thumbnailUrl || item.payload.assetUrl || item.payload.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    <span className="text-body font-medium">{typeLabels[item.type]}</span>
                    {item.collection && (
                      <Badge
                        variant={item.collection as 'grounding' | 'wholeness' | 'growth'}
                        size="sm"
                      >
                        {item.collection}
                      </Badge>
                    )}
                    {hasFlags && (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {item.flags.length} flag{item.flags.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <ItemSummary item={item} />
                </div>

                <span className="text-caption text-[var(--color-text-tertiary)] shrink-0">
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>

              {/* Confidence score */}
              {item.confidence_score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    Confidence:
                  </span>
                  <div className="flex-1 max-w-32 h-1.5 rounded-full bg-elevated overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item.confidence_score >= 0.85 ? 'bg-success' :
                        item.confidence_score >= 0.7 ? 'bg-warning' : 'bg-error'
                      )}
                      style={{ width: `${item.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-caption font-mono">
                    {(item.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {/* Flags */}
              {hasFlags && (
                <div className="mt-2 space-y-1">
                  {item.flags.map((flag) => (
                    <div key={flag} className="flex items-start gap-2 text-caption text-warning">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{item.flag_reasons[flag] || flag}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expandable details */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 flex items-center gap-1 text-body-sm text-sage hover:text-sage/80"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show details
                  </>
                )}
              </button>

              {isExpanded && <ItemDetails item={item} />}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onApprove}
                disabled={isActioning}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={isActioning}
                leftIcon={<X className="h-4 w-4" />}
              >
                Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={isActioning}
                leftIcon={<SkipForward className="h-4 w-4" />}
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Reject reason modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Item"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </div>
        }
      >
        <Textarea
          placeholder="Optional: Add a reason for rejection..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </>
  );
}

function ItemSummary({ item }: { item: ApprovalItem }) {
  const payload = item.payload;

  switch (item.type) {
    case 'asset':
      return (
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
          "{payload.quoteText}" — {payload.format}, {payload.size}
        </p>
      );
    case 'mockup':
      return (
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
          {payload.scene} scene — {payload.creditsUsed} credit{payload.creditsUsed > 1 ? 's' : ''}
        </p>
      );
    case 'pin':
      return (
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
          {payload.title} — {payload.boardName}
        </p>
      );
    case 'ugc':
      return (
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
          From {payload.customerName} — {payload.productName}
        </p>
      );
    case 'product':
      return (
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
          {payload.title} — ${payload.price}
        </p>
      );
    default:
      return null;
  }
}

function ItemDetails({ item }: { item: ApprovalItem }) {
  const payload = item.payload;

  return (
    <div className="mt-3 p-3 rounded-md bg-elevated text-body-sm space-y-2">
      {item.type === 'asset' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Collection:</span>{' '}
              <span className="capitalize">{payload.collection}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Mood:</span>{' '}
              <span className="capitalize">{payload.mood}</span>
            </div>
          </div>
          {payload.qualityScores && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
              <div>
                <span className="text-[var(--color-text-tertiary)] block">Readability</span>
                <span className="font-mono">{(payload.qualityScores.readability * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)] block">Contrast</span>
                <span className="font-mono">{(payload.qualityScores.contrast * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)] block">Composition</span>
                <span className="font-mono">{(payload.qualityScores.composition * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)] block">Overall</span>
                <span className="font-mono font-medium">{(payload.qualityScores.overall * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </>
      )}

      {item.type === 'pin' && (
        <>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Description:</span>
            <p className="mt-1">{payload.description}</p>
          </div>
          {payload.scheduledTime && (
            <div>
              <span className="text-[var(--color-text-tertiary)]">Scheduled:</span>{' '}
              {new Date(payload.scheduledTime).toLocaleString()}
            </div>
          )}
        </>
      )}

      {item.type === 'ugc' && (
        <>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Customer Email:</span>{' '}
            {payload.customerEmail}
          </div>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Order:</span>{' '}
            {payload.orderId}
          </div>
          {payload.moderationScore !== null && (
            <div>
              <span className="text-[var(--color-text-tertiary)]">Moderation Score:</span>{' '}
              <span className={cn(
                'font-mono',
                payload.moderationScore >= 0.9 ? 'text-success' : 'text-warning'
              )}>
                {(payload.moderationScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </>
      )}

      {item.type === 'product' && (
        <>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Description:</span>
            <p className="mt-1 line-clamp-3">{payload.description}</p>
          </div>
          {payload.variants && payload.variants.length > 0 && (
            <div>
              <span className="text-[var(--color-text-tertiary)]">Variants:</span>{' '}
              {payload.variants.map((v) => v.title).join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### `components/approval-queue/approval-empty-state.tsx`
```typescript
'use client';

import { CheckCircle, Zap, Clock, ArrowRight } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Card, Button, Badge } from '@/components/ui';
import Link from 'next/link';

export function ApprovalEmptyState() {
  const { globalMode } = useOperatorMode();

  return (
    <Card className="p-8">
      <div className="text-center max-w-md mx-auto">
        <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        
        <h2 className="text-h2 mb-2">All caught up!</h2>
        <p className="text-body text-[var(--color-text-secondary)] mb-6">
          There are no items waiting for your approval.
        </p>

        {/* Mode-specific messaging */}
        <div className="rounded-lg bg-elevated p-4 text-left mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">
              {globalMode === 'supervised' && 'Supervised Mode'}
              {globalMode === 'assisted' && 'Assisted Mode'}
              {globalMode === 'autopilot' && 'Autopilot Mode'}
            </Badge>
          </div>
          
          {globalMode === 'supervised' && (
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              In Supervised mode, all automated actions will appear here for your review. 
              As you build confidence, consider switching to Assisted mode for routine tasks.
            </p>
          )}
          
          {globalMode === 'assisted' && (
            <div className="space-y-2">
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Low-risk actions are running automatically. High-impact decisions will appear here.
              </p>
              <div className="flex items-center gap-2 text-body-sm text-success">
                <Zap className="h-4 w-4" />
                <span>Auto-approved today: 12 assets, 8 mockups</span>
              </div>
            </div>
          )}
          
          {globalMode === 'autopilot' && (
            <div className="space-y-2">
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Full automation is active. Items only appear here if they require special attention.
              </p>
              <div className="flex items-center gap-2 text-body-sm text-success">
                <Zap className="h-4 w-4" />
                <span>Auto-processed today: 24 assets, 15 mockups, 5 pins</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested actions */}
        <div className="space-y-2">
          <Link href="/dashboard/quotes/new">
            <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Create New Quote
            </Button>
          </Link>
          <Link href="/dashboard/activity">
            <Button variant="ghost" className="w-full">
              View Recent Activity
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
```

- **Step Dependencies**: Step 4.3
- **User Instructions**: None

---

## Step 4.5: Create Approval Queue Page

- **Task**: Assemble the complete approval queue page with all components.

- **Files**:

### `app/(dashboard)/dashboard/approval-queue/page.tsx`
```typescript
import { PageContainer } from '@/components/layout/page-container';
import { ApprovalQueueList } from '@/components/approval-queue/approval-queue-list';

export const metadata = {
  title: 'Approval Queue | Haven Hub',
};

export default function ApprovalQueuePage() {
  return (
    <PageContainer
      title="Approval Queue"
      description="Review and approve pending automated actions"
    >
      <ApprovalQueueList />
    </PageContainer>
  );
}
```

### Update header to show approval badge

### `components/layout/header.tsx` (update)
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, Menu, Command, Inbox } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { ModeSelector } from '@/components/operator-mode/mode-selector';
import { cn } from '@/lib/utils';
import { api } from '@/lib/fetcher';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [notificationCount] = useState(3);

  // Fetch approval counts
  const { data: counts } = useQuery({
    queryKey: ['approval-counts'],
    queryFn: () => api.get<{ total: number }>('/approvals/counts'),
    refetchInterval: 30000,
  });

  const pendingApprovals = counts?.total || 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search trigger */}
        <button
          className="hidden md:flex items-center gap-2 rounded-md border bg-elevated px-3 py-1.5 text-body-sm text-[var(--color-text-tertiary)] hover:border-sage/50 transition-colors"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-4 hidden sm:inline-flex items-center gap-1 rounded border bg-surface px-1.5 text-caption">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Pending approvals */}
        {pendingApprovals > 0 && (
          <Link href="/dashboard/approval-queue">
            <Button variant="ghost" size="sm" className="gap-2">
              <Inbox className="h-4 w-4" />
              <Badge variant="primary" size="sm">{pendingApprovals}</Badge>
            </Button>
          </Link>
        )}

        {/* Mode selector */}
        <ModeSelector />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-medium text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
```

- **Step Dependencies**: Step 4.4
- **User Instructions**: None

---

## Step 4.6: Create Real-time Approval Updates

- **Task**: Implement real-time updates for the approval queue using Supabase Realtime.

- **Files**:

### `hooks/use-approval-realtime.ts`
```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/providers/toast-provider';

export function useApprovalRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('approval-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // New item added to queue
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
          queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
          
          const item = payload.new as { type: string };
          toast(`New ${item.type} ready for review`, 'info');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Item status changed (possibly by another tab/device)
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus !== 'pending') {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
          queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient, toast]);
}
```

### Update `components/approval-queue/approval-queue-list.tsx` to use realtime

Add at the top of the component:
```typescript
import { useAuthContext } from '@/contexts/auth-context';
import { useApprovalRealtime } from '@/hooks/use-approval-realtime';

// Inside the component:
export function ApprovalQueueList() {
  const { user } = useAuthContext();
  
  // Enable real-time updates
  useApprovalRealtime(user?.id);
  
  // ... rest of the component
}
```

- **Step Dependencies**: Step 4.5
- **User Instructions**: Enable Realtime in Supabase Dashboard → Database → Replication

---

**Part 4 Summary**

This part completes:

**Phase 3 (Operator Mode - Steps 3.3-3.6):**
- Mode selector dropdown with grace period handling
- Mode details panel showing approval requirements by module
- Guardrails editor with validation and usage indicators
- Module overrides configuration
- Activity log component
- Complete operator mode settings page

**Phase 4 (Approval Queue - Steps 4.1-4.6):**
- Database schema with polymorphic approval items
- API endpoints for fetching, single actions, and bulk operations
- Custom hook for approval queue data and mutations
- Approval queue list with filtering, selection, keyboard navigation
- Type-specific approval item cards with previews and actions
- Empty state with mode-aware messaging
- Real-time updates via Supabase Realtime

---

**Next: Part 5 will cover Phase 5 (Setup Wizard & Integrations), Phase 6 (Error Management & Exports), Phase 7 (Design System Foundation), and Phase 8 (Design Engine Pipeline)**
