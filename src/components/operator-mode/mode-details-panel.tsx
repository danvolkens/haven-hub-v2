'use client';

import { Shield, Zap, Sparkles, Info } from 'lucide-react';
import { useOperatorMode } from '@/contexts/operator-mode-context';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
