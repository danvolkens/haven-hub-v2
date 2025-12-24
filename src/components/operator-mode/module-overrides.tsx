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
