'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Key,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Label,
  Badge,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { INTEGRATION_CONFIGS, type IntegrationProvider, type Integration } from '@/types/integrations';
import { useToast } from '@/components/providers/toast-provider';

interface SetupProgress {
  shopify: string;
  pinterest: string;
  klaviyo: string;
  dynamic_mockups: string;
  resend: string;
  design_rules: string;
  operator_mode: string;
  import: string;
}

const SETUP_STEPS = [
  { key: 'shopify', label: 'Connect Shopify', type: 'integration' },
  { key: 'pinterest', label: 'Connect Pinterest', type: 'integration' },
  { key: 'klaviyo', label: 'Connect Klaviyo', type: 'integration' },
  { key: 'dynamic_mockups', label: 'Connect Dynamic Mockups', type: 'integration' },
  { key: 'design_rules', label: 'Configure Design Rules', type: 'config' },
  { key: 'operator_mode', label: 'Set Operator Mode', type: 'config' },
] as const;

export default function SetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Fetch setup progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['setup-progress'],
    queryFn: () => api.get<{ setup_progress: SetupProgress }>('/settings/setup-progress'),
  });

  // Fetch integrations
  const { data: integrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<{ integrations: Integration[] }>('/integrations'),
  });
  const integrations = integrationsData?.integrations ?? [];

  // Find first incomplete step
  useEffect(() => {
    if (progress) {
      const firstIncomplete = SETUP_STEPS.findIndex(
        (step) => progress.setup_progress[step.key as keyof SetupProgress] !== 'completed'
      );
      if (firstIncomplete !== -1) {
        setCurrentStep(firstIncomplete);
      }
    }
  }, [progress]);

  const currentStepConfig = SETUP_STEPS[currentStep];
  const isComplete = progress?.setup_progress[currentStepConfig?.key as keyof SetupProgress] === 'completed';
  const integration = integrations.find(
    (i) => i.provider === currentStepConfig?.key
  );

  const completedCount = progress
    ? Object.values(progress.setup_progress).filter((v) => v === 'completed').length
    : 0;
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  const handleSkip = async () => {
    await api.patch(`/settings/setup-progress/${currentStepConfig.key}`, {
      status: 'skipped',
    });
    queryClient.invalidateQueries({ queryKey: ['setup-progress'] });

    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push('/dashboard');
    }
  };

  const handleComplete = () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push('/dashboard');
    }
  };

  if (progressLoading) {
    return (
      <PageContainer title="Setup" description="Setting up Haven Hub...">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Welcome to Haven Hub"
      description="Let's get your marketing operations set up"
    >
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-sm text-[var(--color-text-secondary)]">
              Setup Progress
            </span>
            <span className="text-body-sm font-medium">
              {completedCount} of {totalSteps} complete
            </span>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-sage transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {SETUP_STEPS.map((step, index) => {
            const stepStatus = progress?.setup_progress[step.key as keyof SetupProgress];
            const isCompleted = stepStatus === 'completed';
            const isSkipped = stepStatus === 'skipped';
            const isCurrent = index === currentStep;

            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors',
                  isCurrent ? 'text-sage' : 'text-[var(--color-text-tertiary)]'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCompleted && 'bg-sage border-sage text-white',
                    isSkipped && 'bg-elevated border-[var(--color-border)]',
                    isCurrent && !isCompleted && 'border-sage',
                    !isCurrent && !isCompleted && !isSkipped && 'border-[var(--color-border)]'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-body-sm">{index + 1}</span>
                  )}
                </div>
                <span className="text-caption hidden sm:block">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current step content */}
        <Card className="mb-6">
          <CardHeader
            title={currentStepConfig.label}
            description={getStepDescription(currentStepConfig.key)}
          />
          <CardContent>
            {currentStepConfig.type === 'integration' ? (
              <IntegrationStep
                provider={currentStepConfig.key as IntegrationProvider}
                integration={integration}
                onComplete={handleComplete}
              />
            ) : currentStepConfig.key === 'design_rules' ? (
              <DesignRulesStep onComplete={handleComplete} />
            ) : currentStepConfig.key === 'operator_mode' ? (
              <OperatorModeStep onComplete={handleComplete} />
            ) : null}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
            {isComplete && currentStep < SETUP_STEPS.length - 1 && (
              <Button onClick={handleComplete} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            )}
            {currentStep === SETUP_STEPS.length - 1 && (
              <Button onClick={() => router.push('/dashboard')}>
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function IntegrationStep({
  provider,
  integration,
  onComplete,
}: {
  provider: IntegrationProvider;
  integration?: Integration;
  onComplete: () => void;
}) {
  const config = INTEGRATION_CONFIGS.find((c) => c.provider === provider)!;
  const isConnected = integration?.status === 'connected';
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleOAuthConnect = () => {
    window.location.href = `/api/integrations/${provider}/install`;
  };

  const handleApiKeyConnect = async () => {
    setIsLoading(true);
    try {
      await api.post(`/integrations/${provider}/connect`, { apiKey });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['setup-progress'] });
      toast(`${config.name} connected successfully`, 'success');
      onComplete();
    } catch (error) {
      toast(`Failed to connect ${config.name}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-md bg-success/10 border border-success/20">
        <CheckCircle className="h-5 w-5 text-success" />
        <div>
          <p className="text-body font-medium">Connected to {config.name}</p>
          {integration?.metadata && (
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              {JSON.stringify(integration.metadata).slice(0, 50)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        {config.description}
      </p>

      {config.authType === 'oauth' ? (
        <Button onClick={handleOAuthConnect} rightIcon={<ExternalLink className="h-4 w-4" />}>
          Connect {config.name}
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${config.name} API key`}
              leftIcon={<Key className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleApiKeyConnect} isLoading={isLoading}>
              Connect
            </Button>
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-sage hover:underline"
            >
              Where do I find this?
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function DesignRulesStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        Configure default design rules for your quote-to-asset pipeline.
        You can customize these later in Settings.
      </p>
      <Button onClick={onComplete}>Use Default Rules</Button>
    </div>
  );
}

function OperatorModeStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        Choose how Haven Hub handles automated actions. You can change this anytime.
      </p>
      <div className="space-y-2">
        <Button onClick={onComplete} className="w-full justify-start">
          <div className="text-left">
            <p className="font-medium">Supervised (Recommended for new users)</p>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Review all automated actions before they execute
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function getStepDescription(key: string): string {
  const descriptions: Record<string, string> = {
    shopify: 'Connect your Shopify store to sync products, orders, and customers',
    pinterest: 'Connect Pinterest to publish pins and track performance',
    klaviyo: 'Connect Klaviyo for email marketing automation',
    dynamic_mockups: 'Connect Dynamic Mockups to generate product images',
    design_rules: 'Set default styles, colors, and layouts for generated assets',
    operator_mode: 'Choose how much automation you want',
  };
  return descriptions[key] || '';
}
